import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { BoxIcon, ChevronDownIcon, DownloadIcon, SpinnerIcon } from '../../components/icons';

export const AdminReports = () => {
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedRows, setExpandedRows] = useState([]); // Para controlar quais linhas da tabela estão expandidas
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const notification = useNotification();
    
    // Define as datas padrão
    const getFirstDayOfMonth = () => {
        const date = new Date();
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        return date.toISOString().split('T')[0];
    };
    const getToday = () => {
        return new Date().toISOString().split('T')[0];
    };

    const [startDate, setStartDate] = useState(getFirstDayOfMonth());
    const [endDate, setEndDate] = useState(getToday());

    const formatCurrency = (value) => `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
    const formatDate = (value) => {
        if (!value) return '-';
        return new Date(value).toLocaleDateString('pt-BR');
    };

    const parseOrderItems = (items) => {
        if (!items) return [];
        if (Array.isArray(items)) return items;
        try {
            return JSON.parse(items) || [];
        } catch (error) {
            return [];
        }
    };

    const setDatePreset = (preset) => {
        const today = new Date();
        const start = new Date();

        if (preset === 'today') {
            setStartDate(today.toISOString().split('T')[0]);
            setEndDate(today.toISOString().split('T')[0]);
            return;
        }

        if (preset === '7days') start.setDate(today.getDate() - 6);
        if (preset === '30days') start.setDate(today.getDate() - 29);
        if (preset === 'month') start.setDate(1);

        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
    };

    const detailedSales = useMemo(() => reportData?.detailedSales || [], [reportData]);

    const statusOptions = useMemo(() => {
        return [...new Set(detailedSales.map(order => order.status).filter(Boolean))];
    }, [detailedSales]);

    const filteredSales = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        return detailedSales.filter(order => {
            const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
            if (!normalizedSearch) return matchesStatus;

            const items = parseOrderItems(order.items);
            const searchableText = [
                order.id,
                order.customer_name,
                order.status,
                ...items.map(item => item.name)
            ].join(' ').toLowerCase();

            return matchesStatus && searchableText.includes(normalizedSearch);
        });
    }, [detailedSales, searchTerm, statusFilter]);

    const reportInsights = useMemo(() => {
        const totalRevenue = Number(reportData?.kpis?.totalRevenue) || 0;
        const totalSales = Number(reportData?.kpis?.totalSales) || 0;
        const totalItemsSold = detailedSales.reduce((sum, order) => {
            return sum + parseOrderItems(order.items).reduce((itemsSum, item) => itemsSum + (Number(item.quantity) || 0), 0);
        }, 0);
        const statusBreakdown = detailedSales.reduce((acc, order) => {
            const status = order.status || 'Sem status';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});
        const peakDay = (reportData?.salesOverTime || []).reduce((best, day) => {
            return Number(day.daily_total) > Number(best?.daily_total || 0) ? day : best;
        }, null);
        const topRevenueProduct = (reportData?.topProducts || []).reduce((best, product) => {
            return Number(product.total_revenue) > Number(best?.total_revenue || 0) ? product : best;
        }, null);
        const topCustomer = reportData?.topCustomers?.[0] || null;

        return {
            totalItemsSold,
            avgItemsPerOrder: totalSales > 0 ? totalItemsSold / totalSales : 0,
            revenuePerItem: totalItemsSold > 0 ? totalRevenue / totalItemsSold : 0,
            statusBreakdown,
            peakDay,
            topRevenueProduct,
            topCustomer
        };
    }, [detailedSales, reportData]);

    const toggleRow = (orderId) => {
        setExpandedRows(prev => 
            prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
        );
    };

    // Função para buscar os dados da API
    const handleGenerateReport = useCallback(() => {
        setIsLoading(true);
        setReportData(null); 
        setExpandedRows([]); // Reseta expansão
        setSearchTerm('');
        setStatusFilter('all');
        
        if (window.mySalesOverTimeChart) window.mySalesOverTimeChart.destroy();
        if (window.myTopProductsChart) window.myTopProductsChart.destroy();
        if (window.myStatusDistributionChart) window.myStatusDistributionChart.destroy();

        apiService(`/reports/detailed?startDate=${startDate}&endDate=${endDate}`)
            .then(data => {
                setReportData(data);
            })
            .catch(err => {
                notification.show(`Erro ao gerar relatório: ${err.message}`, 'error');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [startDate, endDate, notification]);

    useEffect(() => {
        handleGenerateReport();
    }, [handleGenerateReport]); 

    useEffect(() => {
        if (reportData && !isLoading) {
            const renderCharts = () => {
                if (window.Chart) {
                    const salesCtx = document.getElementById('salesOverTimeChart')?.getContext('2d');
                    if (salesCtx && reportData.salesOverTime) {
                        if (window.mySalesOverTimeChart) window.mySalesOverTimeChart.destroy();
                        
                        const safeLabels = reportData.salesOverTime.map(d => {
                            if (!d.sale_date) return "Data Inválida";
                            const dateObj = new Date(d.sale_date); 
                            if (isNaN(dateObj.getTime())) return "Data Inválida";
                            return dateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                        });

                        window.mySalesOverTimeChart = new window.Chart(salesCtx, {
                            type: 'line',
                            data: {
                                labels: safeLabels, 
                                datasets: [{
                                    label: 'Faturamento (R$)',
                                    data: reportData.salesOverTime.map(d => d.daily_total),
                                    borderColor: 'rgba(212, 175, 55, 1)',
                                    backgroundColor: 'rgba(212, 175, 55, 0.2)',
                                    fill: true, tension: 0.3
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { display: false },
                                    tooltip: {
                                        callbacks: {
                                            label: (context) => ` ${formatCurrency(context.parsed.y)}`
                                        }
                                    }
                                },
                                scales: {
                                    y: {
                                        ticks: {
                                            callback: (value) => `R$ ${value}`
                                        }
                                    }
                                }
                            }
                        });
                    }
                    
                    const productsCtx = document.getElementById('topProductsChart')?.getContext('2d');
                    if (productsCtx && reportData.topProducts) {
                        if (window.myTopProductsChart) window.myTopProductsChart.destroy();
                        window.myTopProductsChart = new window.Chart(productsCtx, {
                            type: 'bar',
                            data: {
                                labels: reportData.topProducts.map(p => p.name),
                                datasets: [{
                                    label: 'Unidades Vendidas',
                                    data: reportData.topProducts.map(p => p.total_quantity),
                                    backgroundColor: 'rgba(212, 175, 55, 0.8)',
                                    borderWidth: 1
                                }]
                            },
                            options: {
                                indexAxis: 'y',
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } }
                            }
                        });
                    }

                    const statusCtx = document.getElementById('statusDistributionChart')?.getContext('2d');
                    const statusLabels = Object.keys(reportInsights.statusBreakdown);
                    if (statusCtx && statusLabels.length > 0) {
                        if (window.myStatusDistributionChart) window.myStatusDistributionChart.destroy();
                        window.myStatusDistributionChart = new window.Chart(statusCtx, {
                            type: 'doughnut',
                            data: {
                                labels: statusLabels,
                                datasets: [{
                                    data: statusLabels.map(status => reportInsights.statusBreakdown[status]),
                                    backgroundColor: [
                                        'rgba(37, 99, 235, 0.85)',
                                        'rgba(22, 163, 74, 0.85)',
                                        'rgba(245, 158, 11, 0.85)',
                                        'rgba(168, 85, 247, 0.85)',
                                        'rgba(14, 165, 233, 0.85)',
                                        'rgba(239, 68, 68, 0.85)'
                                    ],
                                    borderWidth: 0
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'bottom' }
                                },
                                cutout: '68%'
                            }
                        });
                    }
                } else {
                    setTimeout(renderCharts, 100);
                }
            };
            renderCharts();
        }
    }, [reportData, isLoading, reportInsights.statusBreakdown]);

    const StatCard = ({ title, value, subtitle, accent = 'text-gray-900' }) => (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</h4>
            <p className={`text-3xl font-black mt-2 ${accent}`}>{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-2">{subtitle}</p>}
        </div>
    );

    const runWhenLibsReady = (callback, requiredLibs) => {
        const check = () => {
            const isPdfReady = requiredLibs.includes('pdf') ? (window.jspdf && window.jspdf.jsPDF && typeof window.jspdf.jsPDF.API.autoTable === 'function') : true;
            const isExcelReady = requiredLibs.includes('excel') ? (window.XLSX) : true;
            if (isPdfReady && isExcelReady) callback();
            else setTimeout(check, 100);
        }; check();
    };

    const handleExportPDF = () => {
        if (!reportData) {
            notification.show("Não há dados para exportar.", "error");
            return;
        }

        runWhenLibsReady(() => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const timestamp = new Date().toLocaleString('pt-BR');
            const kpis = reportData.kpis;
            const formattedStartDate = new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR');
            const formattedEndDate = new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR');

            // Título
            doc.setFontSize(18);
            doc.text("Relatório Detalhado de Vendas", pageWidth / 2, 16, { align: 'center' });
            doc.setFontSize(10);
            doc.text(`Período: ${formattedStartDate} a ${formattedEndDate}`, pageWidth / 2, 22, { align: 'center' });
            doc.setFontSize(8);
            doc.text(`Gerado em: ${timestamp}`, pageWidth - 14, 10, { align: 'right' });

            // KPIs
            doc.setFontSize(12);
            doc.text("Resumo do Período", 14, 35);
            doc.autoTable({
                startY: 40,
                head: [['Indicador', 'Valor']],
                body: [
                    ['Faturamento Total', `R$ ${Number(kpis.totalRevenue).toFixed(2)}`],
                    ['Total de Vendas', kpis.totalSales],
                    ['Ticket Médio', `R$ ${Number(kpis.avgOrderValue).toFixed(2)}`],
                    ['Novos Clientes', kpis.newCustomers],
                ],
                theme: 'striped'
            });
            let lastY = doc.lastAutoTable.finalY + 10;

            // Detalhamento de Vendas
            if (reportData.detailedSales && reportData.detailedSales.length > 0) {
                doc.setFontSize(12);
                doc.text("Detalhamento de Vendas e Itens", 14, lastY);
                
                const tableBody = [];
                reportData.detailedSales.forEach(order => {
                    tableBody.push([
                        `#${order.id}`, 
                        order.customer_name, 
                        new Date(order.date).toLocaleDateString(), 
                        `R$ ${Number(order.total).toFixed(2)}`,
                        order.status
                    ]);
                    
                    const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
                    items.forEach(item => {
                        tableBody.push([
                            '', 
                            `-> ${item.quantity}x ${item.name}`, 
                            '', 
                            `R$ ${Number(item.price).toFixed(2)} un.`, 
                            ''
                        ]);
                    });
                });

                doc.autoTable({
                    startY: lastY + 5,
                    head: [['ID', 'Cliente / Produto', 'Data', 'Valor', 'Status']],
                    body: tableBody,
                    theme: 'grid',
                    styles: { fontSize: 8 },
                    columnStyles: {
                        0: { fontStyle: 'bold', cellWidth: 20 },
                        1: { cellWidth: 'auto' },
                        2: { cellWidth: 25 },
                        3: { halign: 'right', cellWidth: 30 },
                        4: { cellWidth: 30 }
                    },
                    didParseCell: function(data) {
                        if (data.section === 'body' && data.row.raw[0] === '') {
                            data.cell.styles.textColor = [100, 100, 100];
                            data.cell.styles.fontStyle = 'italic';
                            data.cell.styles.fillColor = [250, 250, 250];
                        }
                        if (data.section === 'body' && data.row.raw[0] !== '') {
                            data.cell.styles.fillColor = [240, 240, 240];
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                });
                lastY = doc.lastAutoTable.finalY + 10;
            }

            doc.addPage();
            lastY = 20;
            doc.setFontSize(12);
            doc.text("Top Produtos", 14, lastY);
            doc.autoTable({
                startY: lastY + 5,
                head: [['Produto', 'Unidades Vendidas', 'Faturamento (R$)']],
                body: reportData.topProducts.map(p => [
                    p.name,
                    p.total_quantity,
                    `R$ ${Number(p.total_revenue).toFixed(2)}`
                ]),
                theme: 'striped'
            });

            doc.save(`relatorio_detalhado_${startDate}_a_${endDate}.pdf`);
        }, ['pdf']);
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 rounded-3xl p-6 md:p-8 text-white shadow-xl overflow-hidden relative">
                <div className="absolute right-0 top-0 h-40 w-40 bg-amber-400/10 blur-3xl rounded-full"></div>
                <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                    <div>
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-400/15 text-amber-200 text-xs font-bold uppercase tracking-wide border border-amber-300/20">
                            Inteligência de vendas
                        </span>
                        <h1 className="text-3xl md:text-4xl font-black mt-4">Relatórios Detalhados</h1>
                        <p className="text-slate-300 mt-2 max-w-2xl">
                            Acompanhe faturamento, pedidos, clientes, produtos e status em uma visão gerencial do período selecionado.
                        </p>
                    </div>
                    {reportData && (
                        <div className="grid grid-cols-2 gap-3 min-w-full sm:min-w-[360px]">
                            <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
                                <p className="text-xs text-slate-300">Itens vendidos</p>
                                <p className="text-2xl font-black">{reportInsights.totalItemsSold}</p>
                            </div>
                            <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
                                <p className="text-xs text-slate-300">Receita por item</p>
                                <p className="text-2xl font-black">{formatCurrency(reportInsights.revenuePerItem)}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Seletor de Data */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex flex-wrap gap-2 mb-5">
                    {[
                        { key: 'today', label: 'Hoje' },
                        { key: '7days', label: 'Últimos 7 dias' },
                        { key: '30days', label: 'Últimos 30 dias' },
                        { key: 'month', label: 'Mês atual' }
                    ].map(preset => (
                        <button
                            key={preset.key}
                            type="button"
                            onClick={() => setDatePreset(preset.key)}
                            className="px-4 py-2 rounded-full text-sm font-bold bg-gray-100 text-gray-700 hover:bg-amber-100 hover:text-amber-800 transition-colors"
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                    <div className="flex-1">
                        <label htmlFor="startDate" className="block text-sm font-bold text-gray-700">Data de Início</label>
                        <input
                            type="date"
                            id="startDate"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="mt-1 p-3 border border-gray-300 rounded-xl w-full focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                        />
                    </div>
                    <div className="flex-1">
                        <label htmlFor="endDate" className="block text-sm font-bold text-gray-700">Data Final</label>
                        <input
                            type="date"
                            id="endDate"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="mt-1 p-3 border border-gray-300 rounded-xl w-full focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button
                            onClick={handleGenerateReport}
                            disabled={isLoading}
                            className="flex-1 md:flex-none bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-black disabled:bg-gray-400 font-bold flex items-center justify-center gap-2"
                        >
                            {isLoading ? <SpinnerIcon className="h-5 w-5" /> : 'Gerar Relatório'}
                        </button>
                        <button
                            onClick={handleExportPDF}
                            disabled={isLoading || !reportData}
                            className="flex-1 md:flex-none bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 disabled:bg-gray-400 flex items-center justify-center gap-2 font-bold"
                        >
                            <DownloadIcon className="h-5 w-5"/>
                            <span className="hidden md:inline">Exportar PDF</span>
                            <span className="md:hidden">PDF</span>
                        </button>
                    </div>
                </div>
            </div>

            {isLoading && (
                <div className="flex justify-center items-center py-20"><SpinnerIcon className="h-10 w-10 text-amber-500" /></div>
            )}

            {reportData && !isLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-6"
                >
                    {/* KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        <StatCard title="Faturamento Total" value={formatCurrency(reportData.kpis.totalRevenue)} subtitle="Pedidos pagos e em andamento" accent="text-emerald-600" />
                        <StatCard title="Total de Vendas" value={reportData.kpis.totalSales} subtitle={`${filteredSales.length} pedido(s) visíveis nos filtros`} accent="text-blue-600" />
                        <StatCard title="Ticket Médio" value={formatCurrency(reportData.kpis.avgOrderValue)} subtitle="Média por pedido no período" accent="text-purple-600" />
                        <StatCard title="Novos Clientes" value={reportData.kpis.newCustomers} subtitle="Cadastros criados no intervalo" accent="text-amber-600" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Melhor dia do período</p>
                            <p className="text-2xl font-black text-gray-900 mt-2">{reportInsights.peakDay ? formatDate(reportInsights.peakDay.sale_date) : '-'}</p>
                            <p className="text-sm text-gray-500 mt-1">{reportInsights.peakDay ? formatCurrency(reportInsights.peakDay.daily_total) : 'Sem vendas no período'}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Produto com maior receita</p>
                            <p className="text-lg font-black text-gray-900 mt-2 line-clamp-1">{reportInsights.topRevenueProduct?.name || '-'}</p>
                            <p className="text-sm text-gray-500 mt-1">{reportInsights.topRevenueProduct ? formatCurrency(reportInsights.topRevenueProduct.total_revenue) : 'Sem produtos vendidos'}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Cliente destaque</p>
                            <p className="text-lg font-black text-gray-900 mt-2 line-clamp-1">{reportInsights.topCustomer?.name || '-'}</p>
                            <p className="text-sm text-gray-500 mt-1">{reportInsights.topCustomer ? `${formatCurrency(reportInsights.topCustomer.total_spent)} em ${reportInsights.topCustomer.total_orders} pedido(s)` : 'Sem clientes no período'}</p>
                        </div>
                    </div>

                    {/* NOVA SEÇÃO: DETALHAMENTO DE VENDAS */}
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                        <div className="p-5 border-b border-gray-100 bg-gray-50/80">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                <div>
                                    <h3 className="font-black text-xl text-gray-900">Detalhamento de Vendas</h3>
                                    <p className="text-sm text-gray-500 mt-1">{filteredSales.length} de {detailedSales.length} pedido(s) exibidos</p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input
                                        type="search"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Buscar pedido, cliente ou produto..."
                                        className="w-full sm:w-72 p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                                    />
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="p-3 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                                    >
                                        <option value="all">Todos os status</option>
                                        {statusOptions.map(status => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        {filteredSales.length > 0 ? (
                            <>
                                {/* VISÃO DESKTOP (TABELA) */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-100 text-gray-600 font-semibold uppercase text-xs">
                                            <tr>
                                                <th className="p-4 w-10"></th>
                                                <th className="p-4">Pedido</th>
                                                <th className="p-4">Cliente</th>
                                                <th className="p-4">Data</th>
                                                <th className="p-4">Total</th>
                                                <th className="p-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {filteredSales.map(order => {
                                                const isExpanded = expandedRows.includes(order.id);
                                                const items = parseOrderItems(order.items);

                                                return (
                                                    <React.Fragment key={order.id}>
                                                        <tr className={`hover:bg-gray-50 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50' : ''}`} onClick={() => toggleRow(order.id)}>
                                                            <td className="p-4 text-center">
                                                                <ChevronDownIcon className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
                                                            </td>
                                                            <td className="p-4 font-bold text-indigo-600">#{order.id}</td>
                                                            <td className="p-4">{order.customer_name}</td>
                                                            <td className="p-4 text-gray-500">{formatDate(order.date)}</td>
                                                            <td className="p-4 font-bold text-green-600">{formatCurrency(order.total)}</td>
                                                            <td className="p-4">
                                                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
                                                                    {order.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                        {isExpanded && (
                                                            <tr className="bg-gray-50">
                                                                <td colSpan="6" className="p-4 pl-12 border-t border-gray-200 shadow-inner">
                                                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Itens do Pedido:</h4>
                                                                    <div className="space-y-2">
                                                                        {items.map((item, idx) => (
                                                                            <div key={idx} className="flex justify-between text-sm text-gray-700 border-b border-gray-200 pb-1 last:border-0 last:pb-0">
                                                                                <span>{item.quantity}x {item.name}</span>
                                                                                <span className="font-mono">{formatCurrency(item.price)}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* VISÃO MOBILE (CARDS) */}
                                <div className="md:hidden space-y-4 p-4">
                                    {filteredSales.map(order => {
                                        const isExpanded = expandedRows.includes(order.id);
                                        const items = parseOrderItems(order.items);

                                        return (
                                            <div key={order.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                                                <div 
                                                    className={`p-4 flex justify-between items-start cursor-pointer ${isExpanded ? 'bg-blue-50 border-b border-blue-100' : ''}`}
                                                    onClick={() => toggleRow(order.id)}
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-indigo-600">#{order.id}</span>
                                                            <span className="text-xs text-gray-500">{formatDate(order.date)}</span>
                                                        </div>
                                                        <p className="font-medium text-gray-800">{order.customer_name}</p>
                                                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                                            {order.status}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-green-600 mb-2">{formatCurrency(order.total)}</p>
                                                        <ChevronDownIcon className={`h-5 w-5 text-gray-400 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
                                                    </div>
                                                </div>
                                                
                                                {/* Detalhes Mobile Expandidos */}
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div 
                                                            initial={{ height: 0 }} 
                                                            animate={{ height: 'auto' }} 
                                                            exit={{ height: 0 }} 
                                                            className="overflow-hidden bg-gray-50"
                                                        >
                                                            <div className="p-4 border-t border-gray-100">
                                                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1">
                                                                    <BoxIcon className="h-3 w-3"/> Itens do Pedido
                                                                </h4>
                                                                <div className="space-y-3">
                                                                    {items.map((item, idx) => (
                                                                        <div key={idx} className="flex justify-between text-sm text-gray-700 border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                                                                            <div className="flex-1 pr-2">
                                                                                <span className="font-bold text-gray-900">{item.quantity}x</span> {item.name}
                                                                            </div>
                                                                            <span className="font-mono text-gray-600 whitespace-nowrap">{formatCurrency(item.price)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className="p-8 text-center text-gray-500">Nenhuma venda encontrada para os filtros selecionados.</div>
                        )}
                    </div>

                    {/* Gráficos */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[320px] xl:col-span-2">
                            <h3 className="font-black mb-1 text-lg text-gray-900">Vendas ao Longo do Tempo</h3>
                            <p className="text-sm text-gray-500 mb-4">Faturamento diário dos pedidos válidos</p>
                            <div className="relative h-64">
                                <canvas id="salesOverTimeChart"></canvas>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[320px]">
                            <h3 className="font-black mb-1 text-lg text-gray-900">Status dos Pedidos</h3>
                            <p className="text-sm text-gray-500 mb-4">Distribuição operacional do período</p>
                            <div className="relative h-64">
                                <canvas id="statusDistributionChart"></canvas>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[320px] xl:col-span-2">
                            <h3 className="font-black mb-1 text-lg text-gray-900">Produtos Mais Vendidos</h3>
                            <p className="text-sm text-gray-500 mb-4">Ranking por unidades vendidas</p>
                            <div className="relative h-64">
                                <canvas id="topProductsChart"></canvas>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="font-black text-lg text-gray-900">Clientes Mais Valiosos</h3>
                            <p className="text-sm text-gray-500 mb-4">Top compradores por faturamento</p>
                            <div className="space-y-3">
                                {(reportData.topCustomers || []).length > 0 ? reportData.topCustomers.slice(0, 6).map((customer, index) => (
                                    <div key={`${customer.email}-${index}`} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-900 truncate">{index + 1}. {customer.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="font-black text-emerald-600">{formatCurrency(customer.total_spent)}</p>
                                            <p className="text-xs text-gray-500">{customer.total_orders} pedido(s)</p>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-sm text-gray-500 text-center py-8">Nenhum cliente encontrado no período.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};
