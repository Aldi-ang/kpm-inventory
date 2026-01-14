import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { ADMIN_EMAIL } from '../../firebase';

const AdminUserManager = ({ db, appId }) => {
    const [users, setUsers] = useState([]);
    useEffect(() => onSnapshot(collection(db, `artifacts/${appId}/metadata/users`), s => setUsers(s.docs.map(d=>({id:d.id, ...d.data()})))), [db, appId]);
    const toggle = async (uid, status) => updateDoc(doc(db, `artifacts/${appId}/metadata/users`, uid), { status: status==='approved'?'pending':'approved' });
    return (
        <div className="overflow-hidden mt-6 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 shadow-sm">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-700 font-bold dark:text-white">User Access Management</div>
            <table className="w-full text-sm text-left">
                <tbody>{users.map(u => (<tr key={u.id} className="border-b dark:border-slate-700"><td className="p-4 font-medium dark:text-white">{u.email} {u.email===ADMIN_EMAIL && <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded">ADMIN</span>}</td><td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.status==='approved'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{u.status}</span></td><td className="p-4 text-right">{u.email !== ADMIN_EMAIL && <button onClick={()=>toggle(u.id, u.status)} className="text-blue-500 hover:underline">{u.status==='approved'?'Revoke':'Approve'}</button>}</td></tr>))}</tbody>
            </table>
        </div>
    );
};

export default AdminUserManager;