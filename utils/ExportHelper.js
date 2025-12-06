import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import XLSX from 'xlsx';

/**
 * Verileri PDF olarak dışa aktarır
 * @param {string} title - Rapor başlığı
 * @param {Array} data - Tablo verileri (Obje dizisi)
 * @param {Array} columns - Sütun tanımları [{ header: "Ürün Adı", key: "name" }, ...]
 */
export const exportToPDF = async (title, data, columns) => {
    try {
        const htmlContent = generateHTML(title, data, columns);
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
        console.error("PDF Export Error:", error);
        throw error;
    }
};

/**
 * Verileri Excel olarak dışa aktarır
 * @param {string} fileName - Dosya adı (uzantısız)
 * @param {Array} data - Tablo verileri
 * @param {Array} columns - Sütun başlıkları ve anahtarlar
 */
export const exportToExcel = async (fileName, data, columns) => {
    try {
        // Veriyi Excel formatına uygun hale getir
        const excelData = data.map(item => {
            const row = {};
            columns.forEach(col => {
                row[col.header] = item[col.key];
            });
            return row;
        });

        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Rapor");

        const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const uri = FileSystem.cacheDirectory + `${fileName}.xlsx`;

        await FileSystem.writeAsStringAsync(uri, wbout, {
            encoding: FileSystem.EncodingType.Base64
        });

        await Sharing.shareAsync(uri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: 'Excel Dosyasını Paylaş',
            UTI: 'com.microsoft.excel.xlsx'
        });

    } catch (error) {
        console.error("Excel Export Error:", error);
        throw error;
    }
};

const generateHTML = (title, data, columns) => {
    const tableHeaders = columns.map(c => `<th>${c.header}</th>`).join('');
    const tableRows = data.map(item => {
        const cells = columns.map(c => `<td>${item[c.key] !== undefined && item[c.key] !== null ? item[c.key] : '-'}</td>`).join('');
        return `<tr>${cells}</tr>`;
    }).join('');

    return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f2f2f2; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <table>
          <thead>
            <tr>${tableHeaders}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div style="margin-top: 20px; text-align: center; font-size: 10px; color: #888;">
          Bu rapor MiniERP Uygulaması tarafından oluşturulmuştur.
        </div>
      </body>
    </html>
  `;
};
