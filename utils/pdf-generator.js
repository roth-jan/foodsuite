const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

// Register Handlebars helpers
handlebars.registerHelper('formatDate', (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
});

handlebars.registerHelper('formatCurrency', (amount) => {
    if (amount === null || amount === undefined) return '0,00';
    return amount.toFixed(2).replace('.', ',');
});

handlebars.registerHelper('multiply', (a, b) => {
    return (a * b).toFixed(0);
});

handlebars.registerHelper('statusText', (status) => {
    const statusTexts = {
        draft: 'Entwurf',
        sent: 'Versendet',
        paid: 'Bezahlt',
        overdue: 'Überfällig',
        cancelled: 'Storniert'
    };
    return statusTexts[status] || status;
});

class PDFGenerator {
    constructor() {
        this.browser = null;
    }

    async initialize() {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        }
    }

    async generateInvoicePDF(invoiceData) {
        await this.initialize();
        
        try {
            // Load template
            const templatePath = path.join(__dirname, '..', 'templates', 'invoice-template.html');
            const templateContent = await fs.readFile(templatePath, 'utf-8');
            
            // Compile template
            const template = handlebars.compile(templateContent);
            
            // Add company data (in production, this would come from database)
            const data = {
                company: {
                    name: 'FoodSuite GmbH',
                    address: 'Musterstraße 123',
                    zipCode: '80333',
                    city: 'München',
                    phone: '+49 89 123456-0',
                    email: 'rechnung@foodsuite.de',
                    taxId: 'DE123456789',
                    bankName: 'Sparkasse München',
                    iban: 'DE89 3704 0044 0532 0130 00',
                    bic: 'COBADEFFXXX'
                },
                customer: invoiceData.customer || {
                    name: 'Kunde',
                    address: 'Keine Adresse',
                    zipCode: '00000',
                    city: 'Stadt'
                },
                invoice: invoiceData
            };
            
            // Generate HTML
            const html = template(data);
            
            // Create PDF
            const page = await this.browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            
            const pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20mm',
                    right: '20mm',
                    bottom: '20mm',
                    left: '20mm'
                }
            });
            
            await page.close();
            
            return pdf;
        } catch (error) {
            console.error('Error generating PDF:', error);
            throw error;
        }
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

// Singleton instance
let pdfGenerator = null;

module.exports = {
    getPDFGenerator: () => {
        if (!pdfGenerator) {
            pdfGenerator = new PDFGenerator();
        }
        return pdfGenerator;
    }
};