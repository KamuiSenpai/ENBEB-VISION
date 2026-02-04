/**
 * ENBEB VISION - Business Intelligence Analytics Engine
 * Funciones de cálculo puro para estados financieros, KPIs y métricas de clientes
 */

// ============================================
// UTILIDADES
// ============================================

/**
 * Parsea una fecha de string a Date
 */
export const parseDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    return new Date(dateStr + 'T00:00:00');
};

/**
 * Obtiene el rango de fechas para un período
 */
export const getDateRange = (period = 'month', referenceDate = new Date()) => {
    const date = new Date(referenceDate);
    let start, end;

    switch (period) {
        case 'today':
            start = new Date(date.setHours(0, 0, 0, 0));
            end = new Date(date.setHours(23, 59, 59, 999));
            break;
        case 'week':
            const dayOfWeek = date.getDay();
            start = new Date(date);
            start.setDate(date.getDate() - dayOfWeek);
            start.setHours(0, 0, 0, 0);
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            break;
        case 'month':
            start = new Date(date.getFullYear(), date.getMonth(), 1);
            end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
        case 'quarter':
            const quarter = Math.floor(date.getMonth() / 3);
            start = new Date(date.getFullYear(), quarter * 3, 1);
            end = new Date(date.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
            break;
        case 'year':
            start = new Date(date.getFullYear(), 0, 1);
            end = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
            break;
        default:
            start = new Date(date.getFullYear(), date.getMonth(), 1);
            end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    return { start, end };
};

/**
 * Filtra datos por rango de fechas
 */
export const filterByDateRange = (data, start, end, dateField = 'date') => {
    return data.filter(item => {
        const itemDate = parseDate(item[dateField]);
        return itemDate && itemDate >= start && itemDate <= end;
    });
};

// ============================================
// ESTADO DE RESULTADOS (P&L)
// ============================================

/**
 * Calcula el Estado de Resultados completo
 * @param {Array} sales - Ventas del período
 * @param {Array} purchases - Compras del período (para costo)
 * @param {Array} expenses - Gastos del período
 * @returns {Object} Estado de resultados
 */
export const calculateIncomeStatement = (sales = [], purchases = [], expenses = []) => {
    // Ingresos Brutos (sin IGV)
    const grossRevenue = sales.reduce((acc, sale) => {
        const subtotal = sale.subtotal || (sale.total / 1.18);
        return acc + subtotal;
    }, 0);

    // Costo de Ventas (basado en costo de items vendidos)
    const costOfGoodsSold = sales.reduce((acc, sale) => {
        if (!sale.items) return acc;
        const saleCost = sale.items.reduce((itemAcc, item) => {
            return itemAcc + ((item.cost || 0) * item.qty);
        }, 0);
        return acc + saleCost;
    }, 0);

    // Utilidad Bruta
    const grossProfit = grossRevenue - costOfGoodsSold;
    const grossMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;

    // Gastos Operativos
    const operatingExpenses = expenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);

    // EBITDA
    const ebitda = grossProfit - operatingExpenses;
    const ebitdaMargin = grossRevenue > 0 ? (ebitda / grossRevenue) * 100 : 0;

    // Utilidad Operativa (= EBITDA sin depreciación por ahora)
    const operatingIncome = ebitda;

    // Impuesto a la Renta - MYPE (1.5% mensual sobre ingresos netos)
    const incomeTax = grossRevenue > 0 ? grossRevenue * 0.015 : 0;

    // Utilidad Neta
    const netIncome = operatingIncome - incomeTax;
    const netMargin = grossRevenue > 0 ? (netIncome / grossRevenue) * 100 : 0;

    return {
        grossRevenue,
        costOfGoodsSold,
        grossProfit,
        grossMargin,
        operatingExpenses,
        ebitda,
        ebitdaMargin,
        operatingIncome,
        incomeTax,
        netIncome,
        netMargin,
        transactionCount: sales.length
    };
};

// ============================================
// FLUJO DE CAJA REAL
// ============================================

/**
 * Calcula el flujo de caja real (basado en transacciones pagadas)
 */
export const calculateRealCashFlow = (sales = [], purchases = [], expenses = []) => {
    // Cobros realizados (ventas pagadas)
    const cashInflows = sales
        .filter(s => s.status === 'Pagado')
        .reduce((acc, s) => acc + s.total, 0);

    // Pagos realizados (compras pagadas)
    const cashOutflowsPurchases = purchases
        .filter(p => p.status === 'Pagado')
        .reduce((acc, p) => {
            // Considerar IGV si existe
            const total = p.igv ? p.total : (p.total * 1.18);
            return acc + total;
        }, 0);

    // Gastos pagados
    const cashOutflowsExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    const totalOutflows = cashOutflowsPurchases + cashOutflowsExpenses;
    const netCashFlow = cashInflows - totalOutflows;

    return {
        inflows: cashInflows,
        outflowsPurchases: cashOutflowsPurchases,
        outflowsExpenses: cashOutflowsExpenses,
        totalOutflows,
        netCashFlow,
        inflowsCount: sales.filter(s => s.status === 'Pagado').length,
        outflowsCount: purchases.filter(p => p.status === 'Pagado').length
    };
};

// ============================================
// KPIs FINANCIEROS
// ============================================

/**
 * Calcula KPIs de liquidez
 */
export const calculateLiquidityKPIs = (sales = [], purchases = [], daysInPeriod = 30) => {
    // Cuentas por Cobrar (CxC)
    const accountsReceivable = sales
        .filter(s => s.status === 'Pendiente')
        .reduce((acc, s) => acc + s.total, 0);

    // Cuentas por Pagar (CxP)
    const accountsPayable = purchases
        .filter(p => p.status === 'Pendiente')
        .reduce((acc, p) => {
            const total = p.igv ? p.total : (p.total * 1.18);
            return acc + total;
        }, 0);

    // Ventas diarias promedio
    const totalSales = sales.reduce((acc, s) => acc + s.total, 0);
    const dailySales = totalSales / daysInPeriod;

    // Compras diarias promedio
    const totalPurchases = purchases.reduce((acc, p) => {
        const total = p.igv ? p.total : (p.total * 1.18);
        return acc + total;
    }, 0);
    const dailyPurchases = totalPurchases / daysInPeriod;

    // DSO (Days Sales Outstanding)
    const dso = dailySales > 0 ? accountsReceivable / dailySales : 0;

    // DPO (Days Payable Outstanding)
    const dpo = dailyPurchases > 0 ? accountsPayable / dailyPurchases : 0;

    // Working Capital
    const workingCapital = accountsReceivable - accountsPayable;

    return {
        accountsReceivable,
        accountsPayable,
        dso: Math.round(dso),
        dpo: Math.round(dpo),
        cashConversionCycle: Math.round(dso - dpo),
        workingCapital
    };
};

/**
 * Calcula KPIs de inventario
 */
export const calculateInventoryKPIs = (products = [], sales = [], daysInPeriod = 30) => {
    // Inventario total a costo
    const inventoryValue = products.reduce((acc, p) => {
        return acc + ((p.cost || 0) * (p.stock || 0));
    }, 0);

    // Costo de ventas del período
    const costOfGoodsSold = sales.reduce((acc, sale) => {
        if (!sale.items) return acc;
        return acc + sale.items.reduce((itemAcc, item) => {
            return itemAcc + ((item.cost || 0) * item.qty);
        }, 0);
    }, 0);

    // Rotación de inventario (anualizada)
    const annualizedCOGS = (costOfGoodsSold / daysInPeriod) * 365;
    const inventoryTurnover = inventoryValue > 0 ? annualizedCOGS / inventoryValue : 0;

    // Días de inventario
    const daysOfInventory = inventoryTurnover > 0 ? 365 / inventoryTurnover : 0;

    // Productos con stock bajo
    const lowStockProducts = products.filter(p => (p.stock || 0) <= (p.minStock || 5));

    // Productos sin movimiento (no vendidos en el período)
    const soldProductIds = new Set();
    sales.forEach(s => {
        (s.items || []).forEach(i => soldProductIds.add(i.productId));
    });
    const stagnantProducts = products.filter(p => !soldProductIds.has(p.id) && (p.stock || 0) > 0);

    return {
        inventoryValue,
        costOfGoodsSold,
        inventoryTurnover: Math.round(inventoryTurnover * 10) / 10,
        daysOfInventory: Math.round(daysOfInventory),
        lowStockCount: lowStockProducts.length,
        stagnantCount: stagnantProducts.length,
        totalSKUs: products.length
    };
};

// ============================================
// ANÁLISIS DE CLIENTES (RFM)
// ============================================

/**
 * Calcula métricas RFM por cliente
 */
export const calculateCustomerRFM = (clients = [], sales = []) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return clients.map(client => {
        const clientSales = sales.filter(s => s.clientId === client.id);

        if (clientSales.length === 0) {
            return {
                ...client,
                recency: 999,
                frequency: 0,
                monetary: 0,
                avgTicket: 0,
                lastPurchase: null,
                rfmScore: 0,
                segment: 'Lost',
                trend: 'none',
                topProducts: []
            };
        }

        // Ordenar por fecha
        const sortedSales = [...clientSales].sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        );

        // Recencia (días desde última compra)
        const lastPurchaseDate = parseDate(sortedSales[0].date);
        const recency = Math.floor((today - lastPurchaseDate) / (1000 * 60 * 60 * 24));

        // Frecuencia (número de compras)
        const frequency = clientSales.length;

        // Monto (total gastado)
        const monetary = clientSales.reduce((acc, s) => acc + s.total, 0);

        // Ticket promedio
        const avgTicket = monetary / frequency;

        // Top productos
        const productCount = {};
        clientSales.forEach(sale => {
            (sale.items || []).forEach(item => {
                if (!productCount[item.productId]) {
                    productCount[item.productId] = {
                        productId: item.productId,
                        productName: item.productName,
                        qty: 0,
                        revenue: 0
                    };
                }
                productCount[item.productId].qty += item.qty;
                productCount[item.productId].revenue += item.subtotal || 0;
            });
        });
        const topProducts = Object.values(productCount)
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);

        // Tendencia (comparar últimos 3 meses vs 3 meses anteriores)
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const recentSales = clientSales.filter(s => parseDate(s.date) >= threeMonthsAgo);
        const olderSales = clientSales.filter(s => {
            const d = parseDate(s.date);
            return d >= sixMonthsAgo && d < threeMonthsAgo;
        });

        const recentTotal = recentSales.reduce((a, s) => a + s.total, 0);
        const olderTotal = olderSales.reduce((a, s) => a + s.total, 0);

        let trend = 'stable';
        if (olderTotal > 0) {
            const change = ((recentTotal - olderTotal) / olderTotal) * 100;
            if (change > 20) trend = 'up';
            else if (change < -20) trend = 'down';
        } else if (recentTotal > 0) {
            trend = 'new';
        }

        // Segmentación RFM
        let segment = 'Regular';
        if (recency <= 30 && frequency >= 3 && monetary >= 5000) {
            segment = 'Champions';
        } else if (recency <= 60 && frequency >= 2) {
            segment = 'Loyal';
        } else if (recency <= 30 && frequency === 1) {
            segment = 'Promising';
        } else if (recency > 60 && recency <= 90 && frequency >= 2) {
            segment = 'At Risk';
        } else if (recency > 90) {
            segment = 'Lost';
        }

        // Score simple (para ordenar)
        const rfmScore = (100 - Math.min(recency, 100)) + (frequency * 10) + (monetary / 100);

        return {
            ...client,
            recency,
            frequency,
            monetary,
            avgTicket,
            lastPurchase: sortedSales[0].date,
            rfmScore,
            segment,
            trend,
            topProducts
        };
    }).sort((a, b) => b.rfmScore - a.rfmScore);
};

// ============================================
// ANÁLISIS DE PRODUCTOS
// ============================================

/**
 * Calcula métricas por producto
 */
export const calculateProductAnalytics = (products = [], sales = []) => {
    const productMetrics = {};

    // Inicializar métricas
    products.forEach(p => {
        productMetrics[p.id] = {
            ...p,
            unitsSold: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
            margin: 0,
            customerCount: new Set()
        };
    });

    // Acumular ventas
    sales.forEach(sale => {
        (sale.items || []).forEach(item => {
            if (productMetrics[item.productId]) {
                productMetrics[item.productId].unitsSold += item.qty;
                productMetrics[item.productId].revenue += item.subtotal || 0;
                productMetrics[item.productId].cost += (item.cost || 0) * item.qty;
                productMetrics[item.productId].customerCount.add(sale.clientId);
            }
        });
    });

    // Calcular métricas finales
    return Object.values(productMetrics).map(p => {
        const profit = p.revenue - p.cost;
        const margin = p.revenue > 0 ? (profit / p.revenue) * 100 : 0;

        return {
            id: p.id,
            name: p.name,
            category: p.category,
            stock: p.stock || 0,
            unitsSold: p.unitsSold,
            revenue: p.revenue,
            cost: p.cost,
            profit,
            margin: Math.round(margin * 10) / 10,
            customerCount: p.customerCount.size
        };
    }).sort((a, b) => b.revenue - a.revenue);
};

// ============================================
// METAS DE VENTAS
// ============================================

/**
 * Calcula progreso hacia meta de ventas
 */
export const calculateSalesGoalProgress = (sales = [], goalAmount = 0, period = 'month') => {
    const { start, end } = getDateRange(period);
    const periodSales = filterByDateRange(sales, start, end);

    const currentSales = periodSales.reduce((acc, s) => acc + s.total, 0);
    const progress = goalAmount > 0 ? (currentSales / goalAmount) * 100 : 0;

    // Días transcurridos y restantes
    const today = new Date();
    const daysElapsed = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
    const totalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const daysRemaining = totalDays - daysElapsed;

    // Proyección
    const dailyAverage = currentSales / daysElapsed;
    const projectedTotal = dailyAverage * totalDays;
    const projectedProgress = goalAmount > 0 ? (projectedTotal / goalAmount) * 100 : 0;

    // Venta diaria necesaria para alcanzar meta
    const remainingAmount = goalAmount - currentSales;
    const requiredDaily = daysRemaining > 0 ? remainingAmount / daysRemaining : 0;

    return {
        goalAmount,
        currentSales,
        progress: Math.round(progress * 10) / 10,
        daysElapsed,
        daysRemaining,
        dailyAverage,
        projectedTotal,
        projectedProgress: Math.round(projectedProgress * 10) / 10,
        requiredDaily,
        onTrack: projectedTotal >= goalAmount
    };
};

// ============================================
// DATOS PARA GRÁFICOS
// ============================================

/**
 * Genera datos para gráfico de tendencia mensual
 */
export const generateMonthlyTrendData = (sales = [], purchases = [], expenses = [], months = 6) => {
    const data = [];
    const today = new Date();

    for (let i = months - 1; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const { start, end } = getDateRange('month', date);

        const monthSales = filterByDateRange(sales, start, end);
        const monthPurchases = filterByDateRange(purchases, start, end);
        const monthExpenses = filterByDateRange(expenses, start, end);

        const revenue = monthSales.reduce((acc, s) => {
            const subtotal = s.subtotal || (s.total / 1.18);
            return acc + subtotal;
        }, 0);

        const costs = monthSales.reduce((acc, s) => {
            if (!s.items) return acc;
            return acc + s.items.reduce((a, i) => a + ((i.cost || 0) * i.qty), 0);
        }, 0);

        const expensesTotal = monthExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

        data.push({
            month: date.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' }),
            ingresos: Math.round(revenue),
            costos: Math.round(costs),
            gastos: Math.round(expensesTotal),
            utilidad: Math.round(revenue - costs - expensesTotal)
        });
    }

    return data;
};

/**
 * Genera datos para gráfico waterfall del P&L
 */
export const generateWaterfallData = (incomeStatement) => {
    return [
        { name: 'Ingresos', value: incomeStatement.grossRevenue, fill: '#10b981' },
        { name: 'Costo de Ventas', value: -incomeStatement.costOfGoodsSold, fill: '#ef4444' },
        { name: 'Utilidad Bruta', value: incomeStatement.grossProfit, fill: '#3b82f6', isSubtotal: true },
        { name: 'Gastos Operativos', value: -incomeStatement.operatingExpenses, fill: '#f97316' },
        { name: 'EBITDA', value: incomeStatement.ebitda, fill: '#8b5cf6', isSubtotal: true },
        { name: 'Impuestos', value: -incomeStatement.incomeTax, fill: '#64748b' },
        { name: 'Utilidad Neta', value: incomeStatement.netIncome, fill: '#059669', isSubtotal: true }
    ];
};

/**
 * Genera datos para gráfico de tendencia por período (diario/semanal/mensual)
 * @param {Array} sales - Todas las ventas
 * @param {Array} purchases - Todas las compras  
 * @param {Array} expenses - Todos los gastos
 * @param {string} viewMode - 'today', 'month', 'year'
 * @param {Date} referenceDate - Fecha de referencia
 * @param {number} selectedYear - Año seleccionado
 */
export const generatePeriodTrendData = (sales = [], purchases = [], expenses = [], viewMode, referenceDate, selectedYear) => {
    // Get filtered sales for the period
    let start, end;

    if (viewMode === 'today') {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        start = new Date(todayStr + 'T00:00:00');
        end = new Date(todayStr + 'T23:59:59');
    } else if (viewMode === 'year') {
        start = new Date(selectedYear, 0, 1);
        end = new Date(selectedYear, 11, 31, 23, 59, 59);
    } else {
        const range = getDateRange('month', referenceDate);
        start = range.start;
        end = range.end;
    }

    const periodSales = filterByDateRange(sales, start, end);

    // Aggregate by client
    const clientSales = {};
    periodSales.forEach(sale => {
        const clientName = sale.clientName || 'Sin Cliente';
        if (!clientSales[clientName]) {
            clientSales[clientName] = {
                cliente: clientName,
                fullName: clientName,
                ventas: 0,
                transacciones: 0
            };
        }
        clientSales[clientName].ventas += sale.total;
        clientSales[clientName].transacciones += 1;
    });

    // Sort by sales amount and get top 8
    return Object.values(clientSales)
        .sort((a, b) => b.ventas - a.ventas)
        .slice(0, 8)
        .map(c => ({
            ...c,
            ventas: Math.round(c.ventas)
        }));
};

/**
 * Genera datos de los top 10 productos más vendidos en el período
 */
export const generateTopProductsData = (sales = [], viewMode, referenceDate, selectedYear) => {
    let start, end;

    if (viewMode === 'today') {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        start = new Date(todayStr + 'T00:00:00');
        end = new Date(todayStr + 'T23:59:59');
    } else if (viewMode === 'year') {
        start = new Date(selectedYear, 0, 1);
        end = new Date(selectedYear, 11, 31, 23, 59, 59);
    } else {
        const range = getDateRange('month', referenceDate);
        start = range.start;
        end = range.end;
    }

    const periodSales = filterByDateRange(sales, start, end);
    const productSales = {};

    periodSales.forEach(sale => {
        if (sale.items && Array.isArray(sale.items)) {
            sale.items.forEach(item => {
                const productName = item.name || item.productName || 'Desconocido';
                if (!productSales[productName]) {
                    productSales[productName] = {
                        name: productName,
                        fullName: productName,
                        quantity: 0,
                        total: 0
                    };
                }
                productSales[productName].quantity += (item.qty || 0);
                productSales[productName].total += (item.price * item.qty || 0);
            });
        }
    });

    return Object.values(productSales)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)
        .map(p => ({
            ...p,
            total: Math.round(p.total)
        }));
};


