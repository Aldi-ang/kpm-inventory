import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db, APP_ID } from '../firebase';

export const useSharedInventory = (user, isAdmin) => {
    const [masterProducts, setMasterProducts] = useState([]);
    const [userOverrides, setUserOverrides] = useState({});
    const [mergedInventory, setMergedInventory] = useState([]);

    // 1. Listen to Global Master Catalog (Read-Only for users, Write for Admin)
    useEffect(() => {
        const unsub = onSnapshot(collection(db, `artifacts/${APP_ID}/master_catalog`), (snap) => {
            const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setMasterProducts(products);
        });
        return () => unsub();
    }, []);

    // 2. Listen to User's Private Stock/Price Overrides
    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(collection(db, `artifacts/${APP_ID}/users/${user.uid}/products`), (snap) => {
            const overrides = {};
            snap.docs.forEach(d => {
                overrides[d.id] = d.data();
            });
            setUserOverrides(overrides);
        });
        return () => unsub();
    }, [user]);

    // 3. Merge Logic: Combine Master Data + User Data
    useEffect(() => {
        const combined = masterProducts.map(master => {
            const userVersion = userOverrides[master.id] || {};
            return {
                ...master,           // Inherit Name, Image, Type from Admin
                ...userVersion,      // Overwrite with User's Stock & Price
                id: master.id,       // Ensure ID matches
                // If user hasn't set stock, default to 0
                stock: userVersion.stock !== undefined ? userVersion.stock : 0, 
                priceRetail: userVersion.priceRetail !== undefined ? userVersion.priceRetail : master.priceRetail,
                // Flags
                isMaster: true,
                hasUserOverride: !!userOverrides[master.id]
            };
        });
        setMergedInventory(combined);
    }, [masterProducts, userOverrides]);

    // 4. Save Function (Handles Admin vs User logic)
    const saveProduct = async (productData, isNew) => {
        if (!user) return;

        // ADMIN: Updates the Master Catalog (Name, Image, etc.)
        if (isAdmin) {
            const ref = isNew ? doc(collection(db, `artifacts/${APP_ID}/master_catalog`)) : doc(db, `artifacts/${APP_ID}/master_catalog`, productData.id);
            await setDoc(ref, productData, { merge: true });
        } 
        // USER: Only updates Stock and Price in their private folder
        else {
            if (!productData.id) return console.error("Users cannot create new master products");
            
            const userRef = doc(db, `artifacts/${APP_ID}/users/${user.uid}/products`, productData.id);
            // We ONLY save fields users are allowed to change
            const userAllowedData = {
                stock: Number(productData.stock),
                priceRetail: Number(productData.priceRetail),
                priceGrosir: Number(productData.priceGrosir),
                priceEcer: Number(productData.priceEcer),
                updatedAt: serverTimestamp()
            };
            await setDoc(userRef, userAllowedData, { merge: true });
        }
    };

    return { inventory: mergedInventory, saveProduct };
};