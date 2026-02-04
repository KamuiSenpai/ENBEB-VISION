/**
 * Gemini Vision Service for Invoice Processing
 * Uses Google's Gemini API to extract invoice data from images
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Converts a File to base64 string
 * @param {File} file - Image file
 * @returns {Promise<string>} Base64 encoded string
 */
const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = (error) => reject(error);
    });
};

/**
 * Prompt for Gemini to extract invoice data
 */
const INVOICE_EXTRACTION_PROMPT = `Analiza esta imagen de factura/boleta peruana y extrae los datos en formato JSON estricto.

IMPORTANTE:
- Extrae TODOS los productos/items que aparecen en la factura
- Si no puedes leer algún dato claramente, usa "null"
- El RUC tiene 11 dígitos
- La fecha debe estar en formato YYYY-MM-DD

Responde SOLO con el JSON, sin explicaciones ni markdown:

{
    "supplier": {
        "name": "Nombre o Razón Social del proveedor",
        "ruc": "RUC de 11 dígitos o null",
        "address": "Dirección o null"
    },
    "invoice": {
        "type": "Factura o Boleta",
        "number": "Número de documento (ej: F001-00001234)",
        "date": "YYYY-MM-DD",
        "paymentDate": "YYYY-MM-DD o null si no aparece"
    },
    "items": [
        {
            "description": "Nombre/descripción del producto",
            "quantity": 1,
            "unitPrice": 10.50,
            "subtotal": 10.50
        }
    ],
    "totals": {
        "subtotal": 100.00,
        "igv": 18.00,
        "total": 118.00
    },
    "confidence": "high, medium o low según la calidad de la lectura"
}`;

/**
 * Process a single invoice image with Gemini Vision
 * @param {File} imageFile - Invoice image file
 * @returns {Promise<Object>} Extracted invoice data
 */
export const processInvoiceImage = async (imageFile) => {
    try {
        const base64Image = await fileToBase64(imageFile);

        // Get MIME type
        const mimeType = imageFile.type || 'image/jpeg';

        const requestBody = {
            contents: [{
                parts: [
                    { text: INVOICE_EXTRACTION_PROMPT },
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: base64Image
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.1,
                topK: 32,
                topP: 1,
                maxOutputTokens: 4096
            }
        };

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Error al procesar imagen');
        }

        const data = await response.json();

        // Extract the text response
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
            throw new Error('No se recibió respuesta de Gemini');
        }

        // Parse the JSON response (remove any markdown code blocks if present)
        let cleanedResponse = textResponse.trim();
        if (cleanedResponse.startsWith('```json')) {
            cleanedResponse = cleanedResponse.slice(7);
        }
        if (cleanedResponse.startsWith('```')) {
            cleanedResponse = cleanedResponse.slice(3);
        }
        if (cleanedResponse.endsWith('```')) {
            cleanedResponse = cleanedResponse.slice(0, -3);
        }

        const invoiceData = JSON.parse(cleanedResponse.trim());

        // Add metadata
        return {
            ...invoiceData,
            _meta: {
                processedAt: new Date().toISOString(),
                fileName: imageFile.name,
                fileSize: imageFile.size
            }
        };

    } catch (error) {
        console.error('Error processing invoice:', error);
        throw error;
    }
};

/**
 * Process multiple invoice images
 * @param {File[]} imageFiles - Array of invoice image files
 * @param {Function} onProgress - Progress callback (current, total)
 * @returns {Promise<Object[]>} Array of extracted invoice data
 */
export const processMultipleInvoices = async (imageFiles, onProgress) => {
    const results = [];

    for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];

        try {
            if (onProgress) {
                onProgress(i + 1, imageFiles.length, 'processing', file.name);
            }

            const invoiceData = await processInvoiceImage(file);
            results.push({
                success: true,
                data: invoiceData,
                fileName: file.name,
                file: file
            });

        } catch (error) {
            results.push({
                success: false,
                error: error.message,
                fileName: file.name,
                file: file
            });
        }
    }

    if (onProgress) {
        onProgress(imageFiles.length, imageFiles.length, 'complete', null);
    }

    return results;
};

/**
 * Validate extracted invoice data and identify missing/new entities
 * @param {Object} invoiceData - Extracted invoice data
 * @param {Object[]} existingProducts - Existing products in the system
 * @param {Object[]} existingSuppliers - Existing suppliers in the system
 * @returns {Object} Validation result with status and issues
 */
export const validateInvoiceData = (invoiceData, existingProducts, existingSuppliers) => {
    const issues = [];
    let status = 'ready'; // ready, review, error

    // Check supplier
    const supplierName = invoiceData.supplier?.name?.toLowerCase().trim();
    const supplierRuc = invoiceData.supplier?.ruc;

    const matchedSupplier = existingSuppliers.find(s =>
        (s.ruc && s.ruc === supplierRuc) ||
        (s.name && s.name.toLowerCase().includes(supplierName))
    );

    if (!matchedSupplier) {
        issues.push({
            type: 'new_supplier',
            message: `Proveedor nuevo: ${invoiceData.supplier?.name}`,
            severity: 'warning'
        });
        status = 'review';
    }

    // Check products
    const productMatches = [];
    for (const item of (invoiceData.items || [])) {
        const itemName = item.description?.toLowerCase().trim();

        // Try to find matching product
        const matchedProduct = existingProducts.find(p =>
            p.name.toLowerCase().includes(itemName) ||
            itemName.includes(p.name.toLowerCase())
        );

        if (matchedProduct) {
            productMatches.push({
                invoiceItem: item,
                matchedProduct: matchedProduct,
                isNew: false
            });
        } else {
            productMatches.push({
                invoiceItem: item,
                matchedProduct: null,
                isNew: true
            });
            issues.push({
                type: 'new_product',
                message: `Producto nuevo: ${item.description}`,
                severity: 'warning'
            });
            status = 'review';
        }
    }

    // Check for missing data
    if (!invoiceData.invoice?.number) {
        issues.push({
            type: 'missing_data',
            message: 'Número de factura no detectado',
            severity: 'info'
        });
    }

    if (!invoiceData.invoice?.date) {
        issues.push({
            type: 'missing_data',
            message: 'Fecha no detectada',
            severity: 'error'
        });
        status = 'error';
    }

    // Check confidence
    if (invoiceData.confidence === 'low') {
        issues.push({
            type: 'low_confidence',
            message: 'Baja confianza en la lectura, revisar datos',
            severity: 'warning'
        });
        status = 'review';
    }

    return {
        status,
        issues,
        matchedSupplier,
        productMatches,
        hasNewSupplier: !matchedSupplier,
        hasNewProducts: productMatches.some(p => p.isNew),
        newProductsCount: productMatches.filter(p => p.isNew).length
    };
};
