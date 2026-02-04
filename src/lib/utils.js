import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

export const calculatePaymentDate = (invoiceDateStr) => {
    if (!invoiceDateStr) return '';
    const [y, m, d] = invoiceDateStr.split('-').map(Number);
    const invoiceDate = new Date(y, m - 1, d);
    const creditDate = new Date(invoiceDate);
    creditDate.setDate(invoiceDate.getDate() + 10);
    const dayOfWeek = creditDate.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    const paymentDate = new Date(creditDate);
    paymentDate.setDate(creditDate.getDate() + daysUntilFriday);
    const py = paymentDate.getFullYear();
    const pm = String(paymentDate.getMonth() + 1).padStart(2, '0');
    const pd = String(paymentDate.getDate()).padStart(2, '0');
    return `${py}-${pm}-${pd}`;
};

export const formatCurrency = (amount) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);

export const formatDate = (dateString) => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-');
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
};

export const exportToCSV = (data, filename) => {
    const csvContent = "data:text/csv;charset=utf-8,"
        + data.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
