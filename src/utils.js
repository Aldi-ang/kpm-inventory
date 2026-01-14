export const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(number);
};

export const generateId = () => Math.random().toString(36).substr(2, 9);
export const getCurrentDate = () => new Date().toISOString().split('T')[0];

export const getRandomColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
};

export const convertToBks = (qty, unit, product) => {
    const packsPerSlop = product?.packsPerSlop || 10;
    const slopsPerBal = product?.slopsPerBal || 20;
    const balsPerCarton = product?.balsPerCarton || 4;

    if (unit === 'Slop') return qty * packsPerSlop;
    if (unit === 'Bal') return qty * slopsPerBal * packsPerSlop;
    if (unit === 'Karton') return qty * balsPerCarton * slopsPerBal * packsPerSlop;
    return qty;
};