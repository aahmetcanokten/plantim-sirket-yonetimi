import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Colors } from "../Theme";

export const createAndPrintSalesForm = async (sale, company, customer, product, t) => {
    // Format dates
    const saleDate = new Date(sale.dateISO || new Date()).toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    const shipmentDate = sale.shipmentDate
        ? new Date(sale.shipmentDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
        : '-';

    // Fallback for missing data
    const companyName = company?.name || "ŞİRKET ADI";
    const companyAddress = company?.address || "Adres Bilgisi Girilmemiş";
    const companyTax = company?.taxId || "";

    const customerName = customer?.companyName || customer?.name || sale.customerName || "Müşteri";
    const customerPhone = customer?.phone || "-";
    const customerAddress = customer?.address || "-";
    const customerTaxInfo = customer?.cariCode ? `Cari Kod: ${customer?.cariCode}` : "";

    const productName = product?.name || sale.productName || "Ürün";
    const productCode = sale.productCode || product?.code || "-";
    const unitPrice = parseFloat(sale.price || 0).toFixed(2);
    const quantity = parseInt(sale.quantity || 1);
    const totalAmount = (unitPrice * quantity).toFixed(2);
    const invoiceNo = sale.invoiceNumber || "-";

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Satış Formu</title>
        <style>
            body {
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                color: #333;
                padding: 40px;
                max-width: 800px;
                margin: 0 auto;
            }
            .header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 40px;
                border-bottom: 2px solid #333;
                padding-bottom: 20px;
            }
            .company-info h1 {
                margin: 0;
                font-size: 24px;
                color: #1a1a1a;
                text-transform: uppercase;
            }
            .company-info p {
                margin: 5px 0 0;
                font-size: 12px;
                color: #666;
            }
            .document-info {
                text-align: right;
            }
            .document-title {
                font-size: 20px;
                font-weight: bold;
                color: #333;
                margin-bottom: 5px;
            }
            .document-date {
                font-size: 12px;
                color: #666;
            }
            .content-grid {
                display: flex;
                flex-direction: row;
                justify-content: space-between;
                margin-bottom: 40px;
                gap: 40px;
            }
            .box {
                flex: 1;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 20px;
                background-color: #f9f9f9;
            }
            .box-title {
                font-size: 11px;
                font-weight: bold;
                text-transform: uppercase;
                color: #888;
                margin-bottom: 15px;
                letter-spacing: 1px;
                border-bottom: 1px solid #ddd;
                padding-bottom: 8px;
            }
            .info-row {
                margin-bottom: 8px;
                font-size: 13px;
                display: flex;
            }
            .info-label {
                font-weight: 600;
                width: 100px;
                color: #555;
            }
            .info-value {
                flex: 1;
                font-weight: 500;
            }
            
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 40px;
            }
            th, td {
                padding: 15px;
                text-align: left;
                border-bottom: 1px solid #eee;
            }
            th {
                background-color: #f5f5f5;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
                color: #555;
            }
            td {
                font-size: 14px;
            }
            .amount-column {
                text-align: right;
            }
            .total-section {
                text-align: right;
                margin-top: 20px;
                padding-top: 20px;
                border-top: 2px solid #333;
            }
            .total-row {
                display: flex;
                justify-content: flex-end;
                margin-bottom: 10px;
            }
            .total-label {
                font-size: 14px;
                font-weight: bold;
                margin-right: 20px;
                color: #666;
            }
            .total-value {
                font-size: 24px;
                font-weight: bold;
                color: #000;
            }
            
            .footer {
                margin-top: 60px;
                padding-top: 30px;
                border-top: 1px solid #eee;
                font-size: 10px;
                color: #999;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company-info">
                <h1>${companyName}</h1>
                <p>${companyAddress}</p>
                ${companyTax ? `<p>Vergi No: ${companyTax}</p>` : ''}
            </div>
            <div class="document-info">
                <div class="document-title">${t('sales_form') || 'SATIŞ SİPARİŞ FORMU'}</div>
                <div class="document-date">${saleDate}</div>
                ${invoiceNo && invoiceNo !== '-' ? `<div class="document-date">Fatura No: <strong>${invoiceNo}</strong></div>` : ''}
            </div>
        </div>

        <div class="content-grid">
            <div class="box">
                <div class="box-title">${t('customer_details') || 'MÜŞTERİ BİLGİLERİ'}</div>
                <div class="info-row">
                    <span class="info-value" style="font-weight: bold; font-size: 15px;">${customerName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Adres:</span>
                    <span class="info-value">${customerAddress}</span>
                </div>
                 <div class="info-row">
                    <span class="info-label">Telefon:</span>
                    <span class="info-value">${customerPhone}</span>
                </div>
                ${customerTaxInfo ? `
                <div class="info-row">
                    <span class="info-value">${customerTaxInfo}</span>
                </div>` : ''}
            </div>

            <div class="box">
                <div class="box-title">${t('order_details') || 'SİPARİŞ DETAYLARI'}</div>
                <div class="info-row">
                    <span class="info-label">Sipariş ID:</span>
                    <span class="info-value">#${String(sale.id).slice(0, 8)}</span>
                </div>
                 <div class="info-row">
                    <span class="info-label">Sipariş Tarihi:</span>
                    <span class="info-value">${saleDate}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Sevk Tarihi:</span>
                    <span class="info-value">${shipmentDate}</span>
                </div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 15%;">Kod</th>
                    <th style="width: 45%;">Ürün / Hizmet</th>
                    <th style="width: 10%; text-align: center;">Adet</th>
                    <th style="width: 15%;" class="amount-column">Birim Fiyat</th>
                    <th style="width: 15%;" class="amount-column">Tutar</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${productCode}</td>
                    <td>
                        <strong>${productName}</strong>
                        ${product?.category ? `<div style="font-size: 11px; color: #888; margin-top: 4px;">${product.category}</div>` : ''}
                        ${sale.serialNumber ? `<div style="font-size: 11px; color: #888; margin-top: 2px;">Seri No: ${sale.serialNumber}</div>` : ''}
                    </td>
                    <td style="text-align: center;">${quantity}</td>
                    <td class="amount-column">${unitPrice} ₺</td>
                    <td class="amount-column" style="font-weight: bold;">${totalAmount} ₺</td>
                </tr>
            </tbody>
        </table>

        <div class="total-section">
            <div class="total-row">
                <span class="total-label">TOPLAM TUTAR</span>
                <span class="total-value">${totalAmount} ₺</span>
            </div>
        </div>

        <div class="footer">
            <p>Bu belge elektronik olarak oluşturulmuştur. Resmi fatura yerine geçmeyebilir.</p>
            <p>${companyName} | ${companyAddress}</p>
        </div>
    </body>
    </html>
  `;

    try {
        const { uri } = await Print.printToFileAsync({
            html: htmlContent
        });

        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
        console.error('PDF oluşturma hatası:', error);
        throw error;
    }
};
