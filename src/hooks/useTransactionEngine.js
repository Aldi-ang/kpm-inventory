import { doc, collection, serverTimestamp, writeBatch, getDoc, addDoc } from 'firebase/firestore';
import { getCurrentDate, stripCartItemForStorage, convertToBks } from '../utils/helpers';
import useOfflineEngine from './useOfflineEngine';
import { notify } from '../components/Toast.jsx';

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

        // 🚀 THE FORENSIC EXTRACTOR: Strip heavy arrays and create a clean root ledger
        const quarantineCargo = activeCart
            .filter(item => item.condition === 'DAMAGED')
            .map(item => ({
                productId: item.productId,
                itemName: item.name,
                qty: item.qty,
                unit: item.unit,
                returnReason: item.returnReason === 'Other' ? (item.otherReasonDetail || 'Unclassified') : (item.returnReason || 'Unclassified')
            }));
        const forensicData = quarantineCargo.length > 0 ? { quarantineCargo } : null;
        
        if(!customerName) { notify("Customer Name is required!"); return; }

        let currentAgentProfileId = agentProfileId;
        if (userRole === 'ADMIN' && adminSalesMode === 'VEHICLE') currentAgentProfileId = 'ADMIN_VEHICLE';
        else if (userRole === 'ADMIN') currentAgentProfileId = null;

        let finalAgentName = user?.displayName || user?.email?.split('@')[0] || 'Admin';

        // 🚀 THE OFFLINE INTERCEPTOR
        if (!navigator.onLine) {
            try {
                // 🚀 FIX: Resolve the actual registered agent name the same way the online
                // path does (Fleet profile), instead of falling back to the signed-in
                // Google account's displayName. Relies on Firestore's offline cache, which
                // already has this doc since the agent's own profile loads on every session.
                if (currentAgentProfileId) {
                    try {
                        const agentRef = doc(db, `artifacts/${appId}/users/${userId}/motorists`, currentAgentProfileId);
                        const agentDoc = await getDoc(agentRef);
                        if (agentDoc.exists() && agentDoc.data().name) {
                            finalAgentName = agentDoc.data().name;
                        }
                    } catch (e) { /* Offline cache miss — fall back to displayName */ }
                }

                const finalTransItems = activeCart.map(item => {
                    const distPrice = item.product?.priceDistributor || 0;
                    const itemProfit = (item.calculatedPrice * item.qty) - (distPrice * item.qty);
                    // price read from item.product BEFORE stripping it — the snapshot is the
                    // whole reason the embedded copy is not needed in the stored document
                    return {
                        ...stripCartItemForStorage(item),
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
                    type: proofPayload?.type || 'SALE', 
                    timestamp: { seconds: Math.floor(Date.now() / 1000) }, 
                    agentId: currentAgentProfileId || 'ADMIN',
                    agentName: finalAgentName,
                    tempoDays: proofPayload?.tempoDays || null,
                    // Whose store it really was, when the seller was not its assigned agent.
                    // Null on a normal sale. Must stay in step with the online batch below.
                    territoryOverride: proofPayload?.territoryOverride || null,
                    forensicData: forensicData, // 🚀 Bind forensic root for Ghost Ledger
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
                        /* priceTier, NOT pricingTier. This file was the only place in the app
                           writing the second spelling, and App.jsx's permittedCustomers filter
                           reads priceTier — so a store made during a sale was invisible to the
                           agent who made it. Both payloads below must stay in step: this offline
                           one and the online batch.set. */
                        priceTier: newStoreData.isNooRegistration ? newStoreData.requestedTier : 'Ecer',
                        latitude: newStoreData.latitude || null,
                        longitude: newStoreData.longitude || null,
                        status: newStoreData.isNooRegistration ? 'NOO_ACTIVE' : 'WALK_IN',
                        mappedBy: finalAgentName,
                        // 🚀 Phase 7: mappedById/mappedAt so the toko_baru badge (and any future
                        // "who registered this store" query) has an actual agent id + timestamp
                        // to read, not just a display-name snapshot that can't be joined against.
                        mappedById: currentAgentProfileId || null,
                        mappedAt: { seconds: Math.floor(Date.now() / 1000) },
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
                notify("Failed to save to Offline Vault.");
                return;
            }
        }


        // 🌐 ONLINE MODE: Standard Firebase Processing
        try { 
            const batch = writeBatch(db);
            const updatesToPerform = [];
            const transactionItems = []; 
            let totalProfit = 0; 
            const lowStockAlerts = [];

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

                // Buyback of resellable stock: the packs physically came BACK to us, so they go
                // back where the sale would have taken them from. Without this the company pays
                // for goods that re-enter no ledger at all, and the surplus surfaces at EOD as
                // if the agent had miscounted. DAMAGED lines are untouched — they keep going to
                // quarantineCargo. ponytail: returns to the seller's own stock (van, or vault for
                // an admin sale); route to HQ instead if that becomes the policy.
                const isReturnedToStock = proofPayload?.type === 'RETUR' && item.condition !== 'DAMAGED';

                // If Admin Vault is processing, deduct from Master Vault
                if (!currentAgentProfileId && isPhysicallyGiven) {
                    if(prodData.stock < qtyInBks) throw `Not enough stock in Vault for ${item.name}`;
                    const newStock = prodData.stock - qtyInBks;
                    updatesToPerform.push({ ref: prodRef, newStock });
                    // 🔔 NEW: Flag if this sale just pushed the product below its minimum
                    if (newStock <= (prodData.minStock || 50)) {
                        lowStockAlerts.push(`${prodData.name || item.name} (${newStock} Bks left)`);
                    }
                }

                // Admin Vault buyback: put it straight back in the Master Vault.
                if (!currentAgentProfileId && isReturnedToStock) {
                    updatesToPerform.push({ ref: prodRef, newStock: (prodData.stock || 0) + qtyInBks });
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
                    isReturnedToStock,
                    qtyInBks
                }); 
            } 

            let agentDoc = null;
            let agentRef = null;
            
            if (currentAgentProfileId) {
                agentRef = doc(db, `artifacts/${appId}/users/${userId}/motorists`, currentAgentProfileId);
                agentDoc = await getDoc(agentRef);
                // 🚀 FIX: Receipts were showing the logged-in Google account's own name
                // (e.g. whoever is signed in) instead of the identity actually making the sale
                // (e.g. "Admin (Boss Vehicle)" as registered in Fleet & Roster).
                if (agentDoc.exists() && agentDoc.data().name) {
                    finalAgentName = agentDoc.data().name;
                }
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
                // Buyback: put the resellable packs back on the van. New line if he was not
                // carrying that product — the map above only touches lines that already exist.
                transactionItems.filter(t => t.isReturnedToStock).forEach(t => {
                    const idx = updatedCanvas.findIndex(c => c.productId === t.productId);
                    if (idx >= 0) {
                        const c = updatedCanvas[idx];
                        updatedCanvas[idx] = { ...c, qty: c.qty + (t.qtyInBks / convertToBks(1, c.unit, t.prodData)) };
                    } else {
                        updatedCanvas.push({ productId: t.productId, name: t.name, qty: t.qtyInBks, unit: 'Bks' });
                    }
                });

                batch.update(agentRef, { activeCanvas: updatedCanvas.filter(c => c.qty > 0) });
            }

            // Clean up the temporary tracking flags AND the embedded master product before
            // saving to DB — see stripCartItemForStorage for why the product is the one that
            // actually mattered.
            const finalTransItems = transactionItems.map(stripCartItemForStorage);

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
                // Whose store it really was, when the seller was not its assigned agent.
                // Null on a normal sale. Must stay in step with the offline payload above —
                // a sale made offline and one made online have to carry the same evidence.
                territoryOverride: proofPayload?.territoryOverride || null,
                forensicData: forensicData, // 🚀 Bind forensic root for real-time Firebase sync
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
                        priceTier: newStoreData.requestedTier,
                        latitude: newStoreData.latitude,
                        longitude: newStoreData.longitude,
                        status: 'NOO_ACTIVE',
                        mappedBy: finalAgentName,
                        mappedById: currentAgentProfileId || null,
                        mappedAt: serverTimestamp(),
                        hasPhotoProof: true,
                        storeImage: newStoreData.photoUrl || ''
                    });
                } else {
                    batch.set(custRef, {
                        name: customerName,
                        latitude: newStoreData.latitude || null,
                        longitude: newStoreData.longitude || null,
                        priceTier: 'Ecer',
                        status: 'WALK_IN',
                        mappedBy: finalAgentName,
                        mappedAt: serverTimestamp()
                    });
                }
            }

            await batch.commit();

            // 🔔 NEW: One combined notification if this sale pushed anything below its minimum
            if (lowStockAlerts.length > 0) {
                await addDoc(collection(db, `artifacts/${appId}/users/${userId}/notifications`), {
                    title: "📉 Low Stock Warning",
                    message: `Sale just pushed stock below minimum: ${lowStockAlerts.join(', ')}.`,
                    type: "LOW_STOCK",
                    read: false,
                    isRead: false,
                    timestamp: serverTimestamp(),
                    agentId: 'ADMIN',
                    linkToTab: 'inventory'
                });
            }

            await logAudit("SALE", `Transacted with ${customerName} via ${paymentType}`); 
            if (!manualData && setCart) setCart([]); 
            triggerCapy("Manifest Recorded & Receipts Signed! 📜"); 
            window.dispatchEvent(new CustomEvent('trigger-telemetry-ping'));
            
            return finalAgentName; 
        } catch(err) { 
            console.error("TRANSACTION ERROR:", err);
            notify("Transaction Failed: " + err); 
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
                // 🚀 FIX: Same agent-name resolution as the online path below — see
                // processTransaction's offline branch for why this works offline.
                if (currentAgentProfileId) {
                    try {
                        const agentRef = doc(db, `artifacts/${appId}/users/${userId}/motorists`, currentAgentProfileId);
                        const agentDoc = await getDoc(agentRef);
                        if (agentDoc.exists() && agentDoc.data().name) {
                            finalAgentName = agentDoc.data().name;
                        }
                    } catch (e) { /* Offline cache miss — fall back to displayName */ }
                }

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