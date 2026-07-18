import { doc, collection, serverTimestamp, writeBatch, getDoc } from 'firebase/firestore';
import { getCurrentDate } from '../utils/helpers';
import useOfflineEngine from './useOfflineEngine';

export default function useTransactionEngine({
    db, appId, userId, userRole, agentProfileId, adminSalesMode,
    logAudit, triggerCapy, setCart, customers, user 
}) {

    const { isOnline, saveOfflineTransaction, saveOfflineNOO } = useOfflineEngine();

    // --- CORE TRANSACTION ENGINE ---
    const processTransaction = async (e, manualData = null) => { 
        if (e) e.preventDefault(); 
        
        const customerName = manualData ? manualData.customerName : new FormData(e.target).get('customerName')?.trim(); 
        const paymentType = manualData ? manualData.paymentType : new FormData(e.target).get('paymentType'); 
        const activeCart = manualData ? manualData.cart : []; 
        const newStoreData = manualData ? manualData.newStoreData : null; 
        const proofPayload = manualData ? manualData.proofPayload : null; 
        const totalRevenue = activeCart.reduce((acc, item) => acc + (item.calculatedPrice * item.qty), 0); 
        
        if(!customerName) { alert("Customer Name is required!"); return; } 

        let currentAgentProfileId = agentProfileId;
        if (userRole === 'ADMIN' && adminSalesMode === 'VEHICLE') currentAgentProfileId = 'ADMIN_VEHICLE';
        else if (userRole === 'ADMIN') currentAgentProfileId = null;

        let finalAgentName = user?.displayName || user?.email?.split('@')[0] || 'Admin';

        // 🚀 THE OFFLINE INTERCEPTOR
        if (!navigator.onLine) {
            try {
                const finalTransItems = activeCart.map(item => {
                    const distPrice = item.product?.priceDistributor || 0;
                    const itemProfit = (item.calculatedPrice * item.qty) - (distPrice * item.qty);
                    return {
                        ...item,
                        distributorPriceSnapshot: distPrice,
                        profitSnapshot: itemProfit
                    };
                });
                const totalProfit = finalTransItems.reduce((sum, i) => sum + i.profitSnapshot, 0);

                const transactionPayload = {
                    date: getCurrentDate(),
                    customerName,
                    paymentType,
                    items: finalTransItems,
                    total: totalRevenue,
                    totalProfit: totalProfit,
                    type: proofPayload?.type || 'SALE', // 🚀 Respect dynamic txType
                    timestamp: { seconds: Math.floor(Date.now() / 1000) }, 
                    agentId: currentAgentProfileId || 'ADMIN',
                    agentName: finalAgentName,
                    tempoDays: proofPayload?.tempoDays || null,
                    deliveryProof: proofPayload ? {
                        photo: proofPayload.photoData,
                        latitude: proofPayload.latitude,
                        longitude: proofPayload.longitude,
                        capturedAt: proofPayload.timestamp
                    } : null
                };

                await saveOfflineTransaction(transactionPayload);

                if (newStoreData) {
                    const storePayload = {
                        name: customerName,
                        phone: newStoreData.phone || '',
                        address: newStoreData.address || '',
                        pricingTier: newStoreData.isNooRegistration ? newStoreData.requestedTier : 'Ecer',
                        latitude: newStoreData.latitude || null,
                        longitude: newStoreData.longitude || null,
                        status: newStoreData.isNooRegistration ? 'NOO_ACTIVE' : 'WALK_IN',
                        mappedBy: finalAgentName,
                        hasPhotoProof: newStoreData.isNooRegistration ? true : false,
                        storeImage: newStoreData.photoUrl || ''
                    };
                    await saveOfflineNOO(storePayload);
                }

                if (!manualData && setCart) setCart([]);
                triggerCapy("⚠️ Offline Mode: Sale recorded to Ghost Ledger! Will auto-sync when signal returns.");
                window.dispatchEvent(new CustomEvent('trigger-telemetry-ping'));
                return finalAgentName;
            } catch (err) {
                console.error("Ghost Ledger Error:", err);
                alert("Failed to save to Offline Vault.");
                return;
            }
        }


        // 🌐 ONLINE MODE: Standard Firebase Processing
        try { 
            const batch = writeBatch(db);
            const updatesToPerform = [];
            const transactionItems = []; 
            let totalProfit = 0; 

            // 📖 PHASE 1: READS 
            for (const item of activeCart) { 
                const prodRef = doc(db, `artifacts/${appId}/users/${userId}/products`, item.productId); 
                const prodDoc = await getDoc(prodRef); 
                
                if(!prodDoc.exists()) throw `Product ${item.name} not found`; 
                const prodData = prodDoc.data(); 
                
                let mult = 1; 
                if (item.unit === 'Slop') mult = prodData.packsPerSlop || 10; 
                if (item.unit === 'Bal') mult = (prodData.slopsPerBal || 20) * (prodData.packsPerSlop || 10); 
                if (item.unit === 'Karton') mult = (prodData.balsPerCarton || 4) * (prodData.slopsPerBal || 20) * (prodData.packsPerSlop || 10); 
                
                const qtyInBks = item.qty * mult; 

                // 🚀 MATH ENGINE: Determine if we are actually handing over stock right now
                let isPhysicallyGiven = true;
                if (proofPayload?.type === 'RETUR') isPhysicallyGiven = false; // Buyback: Store is returning stock to us
                if (item.fulfillment === 'IOU') isPhysicallyGiven = false; // Exchange: We owe them, nothing given today

                // If Admin Vault is processing, deduct from Master Vault
                if (!currentAgentProfileId && isPhysicallyGiven) {
                    if(prodData.stock < qtyInBks) throw `Not enough stock in Vault for ${item.name}`;
                    updatesToPerform.push({ ref: prodRef, newStock: prodData.stock - qtyInBks });
                }

                // 🛑 DELETED: The illegal badStock Master Vault write that caused Permission Denied for Tier 6!
                
                const distributorPrice = prodData.priceDistributor || 0; 
                const itemProfit = (item.calculatedPrice * item.qty) - (distributorPrice * (isPhysicallyGiven ? qtyInBks : 0)); 
                
                totalProfit += itemProfit;
                transactionItems.push({ 
                    ...item, 
                    distributorPriceSnapshot: distributorPrice, 
                    profitSnapshot: itemProfit, 
                    prodData,
                    isPhysicallyGiven,
                    qtyInBks
                }); 
            } 

            let agentDoc = null;
            let agentRef = null;
            
            if (currentAgentProfileId) {
                agentRef = doc(db, `artifacts/${appId}/users/${userId}/motorists`, currentAgentProfileId);
                agentDoc = await getDoc(agentRef);
            }

            // ✍️ PHASE 2: WRITES 
            for (const update of updatesToPerform) {
                batch.update(update.ref, { stock: update.newStock });
            }
            
            // 🚀 SMART AGENT INVENTORY DEDUCTION
            if (agentDoc && agentDoc.exists()) {
                let currentCanvas = agentDoc.data().activeCanvas || [];
                
                let updatedCanvas = currentCanvas.map(c => {
                    // Find if this product was physically given to the customer in this transaction
                    const givenItems = transactionItems.filter(cartItem => cartItem.productId === c.productId && cartItem.isPhysicallyGiven);
                    
                    if (givenItems.length > 0) {
                        const pData = givenItems[0].prodData || {};
                        let mCanvas = c.unit === 'Slop' ? (pData.packsPerSlop || 10) : c.unit === 'Bal' ? ((pData.slopsPerBal || 20) * (pData.packsPerSlop || 10)) : c.unit === 'Karton' ? ((pData.balsPerCarton || 4) * (pData.slopsPerBal || 20) * (pData.packsPerSlop || 10)) : 1;
                        
                        const totalGivenBks = givenItems.reduce((sum, gi) => sum + gi.qtyInBks, 0);
                        const currentCanvasBks = (c.qty * mCanvas) - totalGivenBks;
                        
                        if (currentCanvasBks < 0) throw `Vehicle doesn't have enough ${givenItems[0].name} left!`;

                        return { ...c, qty: currentCanvasBks / mCanvas }; 
                    }
                    return c;
                });
                batch.update(agentRef, { activeCanvas: updatedCanvas.filter(c => c.qty > 0) });
            }

            // Clean up the temporary tracking flags before saving to DB
            const finalTransItems = transactionItems.map(i => {
                const copy = {...i};
                delete copy.prodData;
                delete copy.isPhysicallyGiven;
                delete copy.qtyInBks;
                return copy;
            });

            // 📖 PHASE 3: RECEIPT GENERATION (Source of Truth)
            const transRef = doc(collection(db, `artifacts/${appId}/users/${userId}/transactions`)); 
            batch.set(transRef, { 
                date: getCurrentDate(), 
                customerName, 
                paymentType, 
                items: finalTransItems, 
                total: totalRevenue, 
                totalProfit: totalProfit, 
                type: proofPayload?.type || 'SALE', 
                timestamp: serverTimestamp(),
                agentId: currentAgentProfileId || 'ADMIN',
                agentName: finalAgentName,
                tempoDays: proofPayload?.tempoDays || null,
                deliveryProof: proofPayload ? {
                    photo: proofPayload.photoData,
                    latitude: proofPayload.latitude,
                    longitude: proofPayload.longitude,
                    capturedAt: proofPayload.timestamp
                } : null
            }); 

            if (newStoreData) {
                const custRef = doc(collection(db, `artifacts/${appId}/users/${userId}/customers`));
                if (newStoreData.isNooRegistration) {
                    batch.set(custRef, {
                        name: customerName,
                        phone: newStoreData.phone,
                        address: newStoreData.address,
                        pricingTier: newStoreData.requestedTier, 
                        latitude: newStoreData.latitude,
                        longitude: newStoreData.longitude,
                        status: 'NOO_ACTIVE', 
                        mappedBy: finalAgentName,
                        mappedAt: serverTimestamp(),
                        hasPhotoProof: true,
                        storeImage: newStoreData.photoUrl || ''
                    });
                } else {
                    batch.set(custRef, {
                        name: customerName,
                        latitude: newStoreData.latitude || null,
                        longitude: newStoreData.longitude || null,
                        pricingTier: 'Ecer', 
                        status: 'WALK_IN',
                        mappedBy: finalAgentName,
                        mappedAt: serverTimestamp()
                    });
                }
            }

            await batch.commit();

            await logAudit("SALE", `Transacted with ${customerName} via ${paymentType}`); 
            if (!manualData && setCart) setCart([]); 
            triggerCapy("Manifest Recorded & Receipts Signed! 📜"); 
            window.dispatchEvent(new CustomEvent('trigger-telemetry-ping'));
            
            return finalAgentName; 
        } catch(err) { 
            console.error("TRANSACTION ERROR:", err);
            alert("Transaction Failed: " + err); 
            throw err; 
        } 
    };

    const handleMerchantSale = async (custName, payMethod, cartItems, newStoreData = null, proofPayload = null) => { 
        const inputTrimmed = custName ? custName.trim().toLowerCase() : "Walk-in Customer";
        const existingProfile = customers.find(c => c.name.toLowerCase() === inputTrimmed || c.name.toLowerCase().includes(inputTrimmed));
        
        let finalName = existingProfile ? existingProfile.name : (custName || "Walk-in Customer").replace(/\b\w/g, l => l.toUpperCase());

        if (!existingProfile && finalName !== "Walk-in Customer") {
            const hasEcer = cartItems.some(i => i.priceTier === 'Ecer');
            const hasGrosir = cartItems.some(i => i.priceTier === 'Grosir');
            
            if (hasEcer) finalName += " (Individual)";
            else if (hasGrosir) finalName += " (Wholesale)";
            else finalName += " (Retail)";
        }

        return await processTransaction(null, { customerName: finalName, paymentType: payMethod, cart: cartItems, newStoreData, proofPayload });
    };

    const handleConsignmentPayment = async (customerName, itemsPaid, amountPaid, itemsReturned = [], returnTotal = 0, itemsRemaining = []) => { 
        try { 
            let finalAgentName = user?.displayName || user?.email?.split('@')[0] || 'Admin';
            let newDocId = null;

            let currentAgentProfileId = agentProfileId;
            if (userRole === 'ADMIN' && adminSalesMode === 'VEHICLE') currentAgentProfileId = 'ADMIN_VEHICLE';
            else if (userRole === 'ADMIN') currentAgentProfileId = null;

            // 🚀 OFFLINE INTERCEPTOR FOR AUDITS
            if (!isOnline) {
                const auditPayload = {
                    date: getCurrentDate(), 
                    customerName, 
                    paymentType: "Cash", 
                    itemsPaid,          
                    itemsReturned,      
                    itemsRemaining,     
                    amountPaid,         
                    returnTotal,        
                    type: 'CONSIGNMENT_PAYMENT', 
                    agentId: currentAgentProfileId || 'ADMIN',
                    agentName: finalAgentName
                };
                
                await saveOfflineTransaction(auditPayload);
                triggerCapy("⚠️ Offline Mode: Audit saved to Ghost Ledger.");
                
                return {
                    id: `OFFLINE_${Date.now()}`,
                    ...auditPayload,
                    total: amountPaid,
                    timestamp: { seconds: Math.floor(Date.now() / 1000) }
                };
            }

            // 🌐 ONLINE MODE: Fire the batch
            const batch = writeBatch(db);
            
            let agentRef = null;
            let agentDoc = null;
            let updatedCanvas = [];

            if (currentAgentProfileId) {
                agentRef = doc(db, `artifacts/${appId}/users/${userId}/motorists`, currentAgentProfileId);
                agentDoc = await getDoc(agentRef);
                if (agentDoc.exists()) updatedCanvas = [...(agentDoc.data().activeCanvas || [])];
            }

            for(const item of itemsReturned) { 
                const prodRef = doc(db, `artifacts/${appId}/users/${userId}/products`, item.productId); 
                const prodDoc = await getDoc(prodRef); 
                if (!prodDoc.exists()) continue;
                
                const pData = prodDoc.data();

                if (currentAgentProfileId && agentDoc && agentDoc.exists()) {
                    const canvasIdx = updatedCanvas.findIndex(c => c.productId === item.productId);
                    let mCanvas = item.unit === 'Slop' ? (pData.packsPerSlop || 10) : item.unit === 'Bal' ? ((pData.slopsPerBal || 20) * (pData.packsPerSlop || 10)) : item.unit === 'Karton' ? ((pData.balsPerCarton || 4) * (pData.slopsPerBal || 20) * (pData.packsPerSlop || 10)) : 1;

                    if (canvasIdx > -1) {
                        let cItem = updatedCanvas[canvasIdx];
                        const currentCanvasBks = cItem.qty * mCanvas;
                        updatedCanvas[canvasIdx] = { ...cItem, qty: (currentCanvasBks + (item.qty * 1)) / mCanvas }; 
                    } else {
                        updatedCanvas.push({ productId: item.productId, name: item.name, qty: item.qty, unit: 'Bks', priceTier: item.priceTier || 'Retail', calculatedPrice: pData.priceRetail || 0 });
                    }
                } else {
                    batch.update(prodRef, { stock: pData.stock + (item.qty * 1) }); 
                }
            } 
            
            if (currentAgentProfileId && agentRef) {
                batch.update(agentRef, { activeCanvas: updatedCanvas });
            }
            
            if (currentAgentProfileId && agentDoc?.exists() && agentDoc.data().name) {
                finalAgentName = agentDoc.data().name;
            }

            const transRef = doc(collection(db, `artifacts/${appId}/users/${userId}/transactions`)); 
            newDocId = transRef.id;

            batch.set(transRef, { 
                date: getCurrentDate(), 
                customerName, 
                paymentType: "Cash", 
                itemsPaid,          
                itemsReturned,      
                itemsRemaining,     
                amountPaid,         
                returnTotal,        
                type: 'CONSIGNMENT_PAYMENT', 
                agentId: currentAgentProfileId || 'ADMIN',
                agentName: finalAgentName,
                timestamp: serverTimestamp() 
            }); 

            await batch.commit();

            triggerCapy("Store Audit successfully recorded!"); 
            window.dispatchEvent(new CustomEvent('trigger-telemetry-ping'));

            return {
                id: newDocId,
                date: getCurrentDate(),
                customerName,
                paymentType: "Cash",
                itemsPaid,
                itemsReturned,
                itemsRemaining,
                amountPaid,
                returnTotal,
                total: amountPaid,
                type: 'CONSIGNMENT_PAYMENT',
                agentName: finalAgentName,
                timestamp: { seconds: Math.floor(Date.now() / 1000) }
            };
        } catch (err) { 
            console.error(err); 
            throw err;
        } 
    };

    const handleConsignmentReturn = async (customerName, itemsReturned, refundValue) => { 
        try { 
            // 🚀 OFFLINE INTERCEPTOR
            if (!isOnline) {
                const returnPayload = { date: getCurrentDate(), customerName, items: itemsReturned, total: -refundValue, type: 'RETURN' };
                await saveOfflineTransaction(returnPayload);
                triggerCapy("⚠️ Offline Mode: Return recorded to Ghost Ledger.");
                return;
            }

            const batch = writeBatch(db);
            
            for(const item of itemsReturned) { 
                const prodRef = doc(db, `artifacts/${appId}/users/${userId}/products`, item.productId); 
                const prodDoc = await getDoc(prodRef); 
                if(prodDoc.exists()) batch.update(prodRef, { stock: prodDoc.data().stock + (item.qty * 1) }); 
            } 
            const returnRef = doc(collection(db, `artifacts/${appId}/users/${userId}/transactions`)); 
            batch.set(returnRef, { date: getCurrentDate(), customerName, items: itemsReturned, total: -refundValue, type: 'RETURN', timestamp: serverTimestamp() }); 
            
            await batch.commit();

            triggerCapy("Return Processed!"); 
        } catch (err) { console.error(err); } 
    };

    return {
        processTransaction,
        handleMerchantSale,
        handleConsignmentPayment,
        handleConsignmentReturn
    };
}