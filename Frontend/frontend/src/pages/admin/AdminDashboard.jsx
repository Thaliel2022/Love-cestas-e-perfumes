import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { QuickStockUpdateModal } from '../../components/admin/QuickStockUpdateModal';
import { MaintenanceModeToggle } from '../../components/admin/Maintenance';
import { getFirstImage } from '../../utils/cloudinary';
import {
    BoxIcon, CheckCircleIcon, ClockIcon, CurrencyDollarIcon, DownloadIcon,
    ExclamationCircleIcon, FileIcon, PhotoIcon, PlusIcon, SearchIcon,
    SparklesIcon, SpinnerIcon, TagIcon, UsersIcon
} from '../../components/icons';

export const AdminDashboard = ({ onNavigate }) => {
    const { user } = useAuth();
    const notification = useNotification();
    const [stats, setStats] = useState({ totalRevenue: 0, totalSales: 0, newCustomers: 0, pendingOrders: 0, prevPeriodRevenue: 0 });
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [selectedStockItem, setSelectedStockItem] = useState(null);
    const [activeFilter, setActiveFilter] = useState('month');
    const [isLoadingData, setIsLoadingData] = useState(true);
    
    // Estados para gráficos
    const [dailySalesData, setDailySalesData] = useState([]);
    const [bestSellersData, setBestSellersData] = useState([]);

    // Funções de exportação
    const runWhenLibsReady = (callback, requiredLibs) => {
        const check = () => {
            const isPdfReady = requiredLibs.includes('pdf') ? (window.jspdf && window.jspdf.jsPDF && typeof window.jspdf.jsPDF.API.autoTable === 'function') : true;
            const isExcelReady = requiredLibs.includes('excel') ? (window.XLSX) : true;
            if (isPdfReady && isExcelReady) callback();
            else setTimeout(check, 100);
        }; check();
    };

    const generatePdf = (data, headers, title) => {
        runWhenLibsReady(() => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const timestamp = new Date().toLocaleString('pt-BR');
            doc.setFontSize(18); doc.text(title, pageWidth / 2, 16, { align: 'center' });
            doc.setFontSize(8); doc.text(timestamp, pageWidth - 14, 10, { align: 'right' });
            doc.autoTable({ head: [headers], body: data, startY: 25 });
            doc.save(`${title.toLowerCase().replace(/ /g, '_')}.pdf`);
        }, ['pdf']);
    };

    const generateExcel = (data, filename) => {
        runWhenLibsReady(() => {
            const wb = window.XLSX.utils.book_new();
            const ws = window.XLSX.utils.json_to_sheet(data);
            window.XLSX.utils.book_append_sheet(wb, ws, "Relatório");
            window.XLSX.writeFile(wb, `${filename}.xlsx`);
        }, ['excel']);
    };

    const handleSalesExport = async (format) => {
        try {
            const orders = await apiService('/orders');
            const data = orders.map(o => ({ Pedido_ID: o.id, Cliente: o.user_name, Data: new Date(o.date).toLocaleDateString(), Total: o.total, Status: o.status }));
            if (format === 'pdf') generatePdf(data.map(Object.values), ['Pedido ID', 'Cliente', 'Data', 'Total', 'Status'], 'Relatorio_Vendas');
            else generateExcel(data, 'relatorio_vendas');
        } catch (error) { notification.show(`Erro exportação: ${error.message}`, 'error'); }
    };

    const handleStockExport = async (format) => {
        try {
            const products = await apiService('/products/all');
            const data = products.map(p => ({ Produto: p.name, Marca: p.brand, Estoque: p.stock, Preço: p.price }));
            if (format === 'pdf') generatePdf(data.map(Object.values), ['Produto', 'Marca', 'Estoque', 'Preço'], 'Relatorio_Estoque');
            else generateExcel(data, 'relatorio_estoque');
        } catch (error) { notification.show(`Erro exportação: ${error.message}`, 'error'); }
    };

    const fetchDashboardData = useCallback((filter = 'month') => {
        setIsLoadingData(true);
        Promise.all([
            apiService(`/reports/dashboard?filter=${filter}`).catch(() => ({ stats: {}, dailySales: [], bestSellers: [] })),
            apiService('/products/low-stock').catch(() => [])
        ]).then(([reportData, lowStockItems]) => {
            const statsData = reportData?.stats || { totalRevenue: 0, totalSales: 0, newCustomers: 0, pendingOrders: 0, prevPeriodRevenue: 0 };
            setStats(statsData);
            setDailySalesData(reportData?.dailySales || []);
            setBestSellersData(reportData?.bestSellers || []);
            setLowStockProducts(lowStockItems || []);
        }).finally(() => setIsLoadingData(false));
    }, []);

    useEffect(() => { fetchDashboardData(activeFilter); }, [activeFilter, fetchDashboardData]);

    useEffect(() => {
        if (!isLoadingData && window.Chart) {
            const renderChart = (id, type, data, options) => {
                const ctx = document.getElementById(id)?.getContext('2d');
                if (ctx) {
                    if (window[`my${id}Chart`]) window[`my${id}Chart`].destroy();
                    window[`my${id}Chart`] = new window.Chart(ctx, { type, data, options });
                }
            };

            const commonOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10, family: 'sans-serif' }, color: '#64748b' } },
                    y: { grid: { borderDash: [2, 4], color: '#f1f5f9' }, ticks: { font: { size: 10 }, color: '#64748b' }, beginAtZero: true }
                }
            };

            const safeLabels = dailySalesData.map(d => {
                if (!d.sale_date) return "";
                const dateObj = new Date(d.sale_date);
                if (isNaN(dateObj.getTime())) {
                     const parts = d.sale_date.split('-');
                     if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('pt-BR');
                     return "";
                }
                return dateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            });

            renderChart('dailySalesChart', 'line', {
                labels: safeLabels,
                datasets: [{
                    label: 'Faturamento',
                    data: dailySalesData.map(d => d.daily_total),
                    borderColor: '#4f46e5', // Indigo 600
                    backgroundColor: (context) => {
                        const ctx = context.chart.ctx;
                        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                        gradient.addColorStop(0, 'rgba(79, 70, 229, 0.2)');
                        gradient.addColorStop(1, 'rgba(79, 70, 229, 0.0)');
                        return gradient;
                    },
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    fill: true,
                    tension: 0.4
                }]
            }, commonOptions);

            renderChart('bestSellersChart', 'bar', {
                labels: bestSellersData.map(p => p.name.substring(0, 15) + '...'),
                datasets: [{
                    label: 'Vendas',
                    data: bestSellersData.map(p => p.sales || 0),
                    backgroundColor: '#0ea5e9', // Sky 500
                    borderRadius: 4,
                    barThickness: 20
                }]
            }, { ...commonOptions, indexAxis: 'y' });
        }
    }, [isLoadingData, dailySalesData, bestSellersData]);

    const handleQuickStockSave = () => {
        setIsStockModalOpen(false);
        setSelectedStockItem(null);
        fetchDashboardData(activeFilter);
    };

    const calculateGrowth = () => {
        if (!stats.prevPeriodRevenue) return { text: '--', isPositive: true };
        const current = Number(stats.totalRevenue);
        const prev = Number(stats.prevPeriodRevenue);
        if (prev === 0) return { text: current > 0 ? '+100%' : '0%', isPositive: true };
        const growth = ((current - prev) / prev) * 100;
        return { text: `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`, isPositive: growth >= 0 };
    };
    const growth = calculateGrowth();

    const StatCard = ({ title, value, icon: Icon, growth, subtext, iconBg, iconColor }) => (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between hover:shadow-md transition-all duration-300"
        >
            <div>
                <p className="text-sm font-semibold text-gray-500 mb-1 tracking-wide uppercase text-[10px]">{title}</p>
                <h4 className="text-2xl font-extrabold text-slate-800">{value}</h4>
                {(growth || subtext) && (
                    <div className="flex items-center gap-2 mt-2">
                        {growth && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${growth.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {growth.text}
                            </span>
                        )}
                        {subtext && <span className="text-xs text-gray-400">{subtext}</span>}
                    </div>
                )}
            </div>
            <div className={`p-3 rounded-lg ${iconBg}`}>
                <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
        </motion.div>
    );

    const LowStockWidget = () => {
        const [searchTerm, setSearchTerm] = useState('');
        const filtered = lowStockProducts.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                        <ExclamationCircleIcon className="h-5 w-5 text-amber-500" />
                        Reposição Necessária
                    </h3>
                    <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">{lowStockProducts.length}</span>
                </div>
                <div className="p-3 bg-white border-b border-gray-50">
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Buscar produto..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                        <SearchIcon className="absolute left-3 top-2 h-3.5 w-3.5 text-gray-400" />
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto max-h-[320px] p-2 space-y-1 custom-scrollbar">
                    {filtered.length > 0 ? filtered.map(item => (
                        <div 
                            key={item.id + item.name} 
                            onClick={() => { setSelectedStockItem(item); setIsStockModalOpen(true); }}
                            className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group border border-transparent hover:border-gray-100 cursor-pointer"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-8 h-8 rounded bg-gray-100 flex-shrink-0 border border-gray-200 p-0.5">
                                    <img src={getFirstImage(item.images)} alt={item.name} className="w-full h-full object-contain rounded-sm" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-700 truncate">{item.name}</p>
                                    <p className="text-[10px] text-slate-400">{item.brand}</p>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0 flex flex-col items-end">
                                <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{item.stock} un.</span>
                                <span 
                                    className="text-[10px] text-indigo-600 font-bold mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    Repor
                                </span>
                            </div>
                        </div>
                    )) : (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                            <CheckCircleIcon className="h-8 w-8 text-green-100 mb-2"/>
                            <p className="text-xs">Estoque saudável!</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 pb-10">
            <AnimatePresence>
                {isStockModalOpen && (
                    <QuickStockUpdateModal item={selectedStockItem} onClose={() => setIsStockModalOpen(false)} onSave={handleQuickStockSave} />
                )}
            </AnimatePresence>

            {/* Header com Filtros */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 pb-5">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
                    <p className="text-slate-500 text-sm mt-1">Bem-vindo de volta, {user?.name.split(' ')[0]}. Aqui está o que está acontecendo hoje.</p>
                </div>
                <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                    {['today', 'week', 'month', 'year'].map(f => {
                        const labels = { today: 'Hoje', week: '7 Dias', month: 'Este Mês', year: 'Este Ano' };
                        return (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeFilter === f ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-gray-50'}`}
                            >
                                {labels[f]}
                            </button>
                        );
                    })}
                </div>
            </div>

            {isLoadingData ? (
                <div className="flex justify-center py-20"><SpinnerIcon className="h-10 w-10 text-indigo-500 animate-spin"/></div>
            ) : (
                <>
                    {/* Cards de KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard 
                            title="Faturamento Total" 
                            value={`R$ ${Number(stats.totalRevenue).toFixed(2)}`} 
                            growth={growth}
                            subtext="vs. período anterior"
                            icon={CurrencyDollarIcon}
                            iconBg="bg-green-100"
                            iconColor="text-green-600"
                        />
                        <StatCard 
                            title="Vendas Realizadas" 
                            value={stats.totalSales} 
                            icon={BoxIcon}
                            iconBg="bg-blue-100"
                            iconColor="text-blue-600"
                        />
                        <StatCard 
                            title="Novos Clientes" 
                            value={stats.newCustomers} 
                            icon={UsersIcon}
                            iconBg="bg-purple-100"
                            iconColor="text-purple-600"
                        />
                        <StatCard 
                            title="Pedidos Pendentes" 
                            value={stats.pendingOrders} 
                            icon={ClockIcon}
                            iconBg="bg-amber-100"
                            iconColor="text-amber-600"
                        />
                    </div>

                    {/* Seção de Exportação */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-slate-800 text-lg mb-4">Exportar Relatórios</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button 
                                onClick={() => handleSalesExport('excel')} 
                                className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                            >
                                <DownloadIcon className="h-5 w-5"/> <span>Vendas (Excel)</span>
                            </button>
                            <button 
                                onClick={() => handleStockExport('excel')} 
                                className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                            >
                                <DownloadIcon className="h-5 w-5"/> <span>Estoque (Excel)</span>
                            </button>
                            <button 
                                onClick={() => handleSalesExport('pdf')} 
                                className="bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                            >
                                <DownloadIcon className="h-5 w-5"/> <span>Vendas (PDF)</span>
                            </button>
                        </div>
                    </div>

                    {/* Área Principal: Gráfico e Estoque */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Gráfico Principal */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">Performance de Vendas</h3>
                                    <p className="text-xs text-gray-400">Receita bruta ao longo do tempo</p>
                                </div>
                            </div>
                            <div className="h-80 w-full relative">
                                <canvas id="dailySalesChart"></canvas>
                            </div>
                        </div>

                        {/* Widget Lateral */}
                        <div className="space-y-6">
                            <div className="h-full">
                                <LowStockWidget />
                            </div>
                        </div>
                    </div>

                    {/* Área Inferior: Ações e Secundários */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Gráfico Secundário */}
                        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-slate-800 text-lg mb-4">Top 5 Mais Vendidos</h3>
                            <div className="h-64 relative">
                                <canvas id="bestSellersChart"></canvas>
                            </div>
                        </div>
                        
                        {/* Manutenção e Ações Rápidas */}
                        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
                                <h3 className="font-bold text-slate-800 mb-2">Status da Loja</h3>
                                <MaintenanceModeToggle />
                            </div>

                            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-xl shadow-lg text-white">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <SparklesIcon className="h-5 w-5 text-amber-400"/> Ações Rápidas
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => onNavigate('admin/products')} className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-left transition-all hover:scale-105 border border-white/5">
                                        <PlusIcon className="h-5 w-5 mb-2 text-green-400"/>
                                        <span className="text-xs font-bold block text-gray-200">Novo Produto</span>
                                    </button>
                                    <button onClick={() => onNavigate('admin/banners')} className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-left transition-all hover:scale-105 border border-white/5">
                                        <PhotoIcon className="h-5 w-5 mb-2 text-blue-400"/>
                                        <span className="text-xs font-bold block text-gray-200">Banners</span>
                                    </button>
                                    <button onClick={() => handleStockExport('excel')} className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-left transition-all hover:scale-105 border border-white/5">
                                        <FileIcon className="h-5 w-5 mb-2 text-amber-400"/>
                                        <span className="text-xs font-bold block text-gray-200">Rel. Estoque</span>
                                    </button>
                                    <button onClick={() => onNavigate('admin/coupons')} className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-left transition-all hover:scale-105 border border-white/5">
                                        <TagIcon className="h-5 w-5 mb-2 text-pink-400"/>
                                        <span className="text-xs font-bold block text-gray-200">Cupom</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
