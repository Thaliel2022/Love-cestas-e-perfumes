import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { BoxIcon, ChevronDownIcon, DownloadIcon, SpinnerIcon } from '../../components/icons';

export const AdminReports = () => {
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedRows, setExpandedRows] = useState([]); // Para controlar quais linhas da tabela estão expandidas
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
        
        if (window.mySalesOverTimeChart) window.mySalesOverTimeChart.destroy();
        if (window.myTopProductsChart) window.myTopProductsChart.destroy();

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
                            options: { responsive: true, maintainAspectRatio: false }
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
                            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
                        });
                    }
                } else {
                    setTimeout(renderCharts, 100);
                }
            };
            renderCharts();
        }
    }, [reportData, isLoading]);

    const StatCard = ({ title, value }) => (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <h4 className="text-sm font-semibold text-gray-500 uppercase">{title}</h4>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
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
        <div>
            <h1 className="text-3xl font-bold mb-6">Relatórios Detalhados</h1>
            
            {/* Seletor de Data */}
            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Data de Início</label>
                        <input
                            type="date"
                            id="startDate"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="mt-1 p-2 border border-gray-300 rounded-md w-full md:w-auto"
                        />
                    </div>
                    <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Data Final</label>
                        <input
                            type="date"
                            id="endDate"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="mt-1 p-2 border border-gray-300 rounded-md w-full md:w-auto"
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto mt-3 md:mt-6">
                        <button
                            onClick={handleGenerateReport}
                            disabled={isLoading}
                            className="flex-1 md:flex-none bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-900 disabled:bg-gray-400"
                        >
                            {isLoading ? <SpinnerIcon /> : 'Gerar Relatório'}
                        </button>
                        <button
                            onClick={handleExportPDF}
                            disabled={isLoading || !reportData}
                            className="flex-1 md:flex-none bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Faturamento Total" value={`R$ ${Number(reportData.kpis.totalRevenue).toFixed(2)}`} />
                        <StatCard title="Total de Vendas" value={reportData.kpis.totalSales} />
                        <StatCard title="Ticket Médio" value={`R$ ${Number(reportData.kpis.avgOrderValue).toFixed(2)}`} />
                        <StatCard title="Novos Clientes" value={reportData.kpis.newCustomers} />
                    </div>

                    {/* NOVA SEÇÃO: DETALHAMENTO DE VENDAS */}
                    <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                        <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800">Detalhamento de Vendas ({reportData.detailedSales ? reportData.detailedSales.length : 0})</h3>
                        </div>
                        {reportData.detailedSales && reportData.detailedSales.length > 0 ? (
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
                                            {reportData.detailedSales.map(order => {
                                                const isExpanded = expandedRows.includes(order.id);
                                                const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);

                                                return (
                                                    <React.Fragment key={order.id}>
                                                        <tr className={`hover:bg-gray-50 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50' : ''}`} onClick={() => toggleRow(order.id)}>
                                                            <td className="p-4 text-center">
                                                                <ChevronDownIcon className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
                                                            </td>
                                                            <td className="p-4 font-bold text-indigo-600">#{order.id}</td>
                                                            <td className="p-4">{order.customer_name}</td>
                                                            <td className="p-4 text-gray-500">{new Date(order.date).toLocaleDateString()}</td>
                                                            <td className="p-4 font-bold text-green-600">R$ {Number(order.total).toFixed(2)}</td>
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
                                                                                <span className="font-mono">R$ {Number(item.price).toFixed(2)}</span>
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
                                    {reportData.detailedSales.map(order => {
                                        const isExpanded = expandedRows.includes(order.id);
                                        const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);

                                        return (
                                            <div key={order.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                                                <div 
                                                    className={`p-4 flex justify-between items-start cursor-pointer ${isExpanded ? 'bg-blue-50 border-b border-blue-100' : ''}`}
                                                    onClick={() => toggleRow(order.id)}
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-indigo-600">#{order.id}</span>
                                                            <span className="text-xs text-gray-500">{new Date(order.date).toLocaleDateString()}</span>
                                                        </div>
                                                        <p className="font-medium text-gray-800">{order.customer_name}</p>
                                                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                                            {order.status}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-green-600 mb-2">R$ {Number(order.total).toFixed(2)}</p>
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
                                                                            <span className="font-mono text-gray-600 whitespace-nowrap">R$ {Number(item.price).toFixed(2)}</span>
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
                            <div className="p-8 text-center text-gray-500">Nenhuma venda encontrada neste período.</div>
                        )}
                    </div>

                    {/* Gráficos */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow min-h-[300px]">
                            <h3 className="font-bold mb-4 text-lg">Vendas ao Longo do Tempo</h3>
                            <div className="relative h-64">
                                <canvas id="salesOverTimeChart"></canvas>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow min-h-[300px]">
                            <h3 className="font-bold mb-4 text-lg">Produtos Mais Vendidos (por Unidade)</h3>
                            <div className="relative h-64">
                                <canvas id="topProductsChart"></canvas>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};
