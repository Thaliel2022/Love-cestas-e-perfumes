import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

const FILTER_LABELS = {
    today: 'Hoje',
    week: '7 dias',
    month: 'Este mês',
    year: 'Este ano'
};

const formatCurrency = (value) => Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
});

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

    const activeFilterLabel = FILTER_LABELS[activeFilter] || 'Período';
    const totalRevenue = Number(stats.totalRevenue || 0);
    const totalSales = Number(stats.totalSales || 0);
    const averageTicket = useMemo(() => totalSales > 0 ? totalRevenue / totalSales : 0, [totalRevenue, totalSales]);
    const hasDailySales = dailySalesData.some(item => Number(item.daily_total || 0) > 0);
    const hasBestSellers = bestSellersData.length > 0;

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
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        titleColor: '#f8fafc',
                        bodyColor: '#e2e8f0',
                        padding: 12,
                        cornerRadius: 12,
                        displayColors: false,
                        callbacks: {
                            label: (context) => context.dataset.label === 'Faturamento'
                                ? `Faturamento: ${formatCurrency(context.raw)}`
                                : `Vendas: ${context.raw}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10, family: 'sans-serif', weight: '600' }, color: '#94a3b8', maxRotation: 0 }
                    },
                    y: {
                        grid: { color: '#eef2f7' },
                        border: { display: false },
                        ticks: {
                            font: { size: 10 },
                            color: '#94a3b8',
                            callback: (value) => typeof value === 'number' && value >= 1000 ? `${Math.round(value / 1000)}k` : value
                        },
                        beginAtZero: true
                    }
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
                    borderColor: '#4f46e5',
                    backgroundColor: (context) => {
                        const ctx = context.chart.ctx;
                        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                        gradient.addColorStop(0, 'rgba(79, 70, 229, 0.28)');
                        gradient.addColorStop(1, 'rgba(79, 70, 229, 0.0)');
                        return gradient;
                    },
                    borderWidth: 3,
                    pointRadius: 3,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#4f46e5',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4
                }]
            }, commonOptions);

            renderChart('bestSellersChart', 'bar', {
                labels: bestSellersData.map(p => p.name.substring(0, 15) + '...'),
                datasets: [{
                    label: 'Vendas',
                    data: bestSellersData.map(p => p.sales || 0),
                    backgroundColor: '#0ea5e9',
                    hoverBackgroundColor: '#0284c7',
                    borderRadius: 999,
                    barThickness: 18
                }]
            }, {
                ...commonOptions,
                indexAxis: 'y',
                scales: {
                    x: { ...commonOptions.scales.y, ticks: { ...commonOptions.scales.y.ticks, precision: 0 } },
                    y: { ...commonOptions.scales.x, ticks: { ...commonOptions.scales.x.ticks, autoSkip: false } }
                }
            });
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

    const ChartEmptyState = ({ title, description }) => (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 text-center px-6">
            <div className="h-12 w-12 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm mb-3">
                <ChartIconFallback />
            </div>
            <p className="text-sm font-bold text-slate-700">{title}</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">{description}</p>
        </div>
    );

    const ChartIconFallback = () => (
        <svg className="h-6 w-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M8 16v-5m4 5V8m4 8v-7" />
        </svg>
    );

    const StatCard = ({ title, value, icon: Icon, growth, subtext, iconBg, iconColor, accent = 'from-slate-50 to-white' }) => (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative overflow-hidden bg-gradient-to-br ${accent} p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-start justify-between hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300`}
        >
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/60 blur-xl" />
            <div>
                <p className="text-[11px] font-black text-slate-500 mb-2 tracking-[0.16em] uppercase">{title}</p>
                <h4 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{value}</h4>
                {(growth || subtext) && (
                    <div className="flex items-center gap-2 mt-3">
                        {growth && (
                            <span className={`text-xs font-black px-2.5 py-1 rounded-full ${growth.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {growth.text}
                            </span>
                        )}
                        {subtext && <span className="text-xs font-medium text-slate-500">{subtext}</span>}
                    </div>
                )}
            </div>
            <div className={`relative p-3 rounded-2xl ${iconBg} shadow-sm`}>
                <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
        </motion.div>
    );

    const LowStockWidget = () => {
        const [searchTerm, setSearchTerm] = useState('');
        const filtered = lowStockProducts.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

        return (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-gradient-to-br from-amber-50 to-white">
                    <div>
                        <p className="text-xs uppercase tracking-wider text-amber-600 font-black mb-1">Estoque</p>
                        <h3 className="font-black text-slate-900 flex items-center gap-2 text-lg">
                            <ExclamationCircleIcon className="h-5 w-5 text-amber-500" />
                            Reposição Necessária
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Clique em um item para ajustar rapidamente.</p>
                    </div>
                    <span className="text-xs font-black bg-amber-100 text-amber-800 px-3 py-1 rounded-full">{lowStockProducts.length}</span>
                </div>
                <div className="p-4 bg-white border-b border-slate-100">
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Buscar produto..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                        <SearchIcon className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto max-h-[320px] p-3 space-y-2 custom-scrollbar">
                    {filtered.length > 0 ? filtered.map(item => (
                        <div 
                            key={item.id + item.name} 
                            onClick={() => { setSelectedStockItem(item); setIsStockModalOpen(true); }}
                            className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-all group border border-transparent hover:border-slate-200 cursor-pointer"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex-shrink-0 border border-slate-200 p-1">
                                    <img src={getFirstImage(item.images)} alt={item.name} className="w-full h-full object-contain rounded-sm" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                                    <p className="text-[10px] text-slate-400">{item.brand}</p>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0 flex flex-col items-end">
                                <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-1 rounded-full">{item.stock} un.</span>
                                <span 
                                    className="text-[10px] text-indigo-600 font-bold mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    Repor
                                </span>
                            </div>
                        </div>
                    )) : (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                            <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
                                <CheckCircleIcon className="h-7 w-7 text-green-500"/>
                            </div>
                            <p className="text-sm font-bold text-slate-600">Estoque saudável!</p>
                            <p className="text-xs text-slate-400 mt-1">Nenhum item crítico encontrado.</p>
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

            {/* Header executivo */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-xl border border-white/10">
                <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,_#fbbf24,_transparent_32%),radial-gradient(circle_at_bottom_left,_#4f46e5,_transparent_28%)]" />
                <div className="relative flex flex-col xl:flex-row justify-between gap-6">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1 text-xs font-bold text-amber-200 mb-4">
                            <SparklesIcon className="h-4 w-4" />
                            Painel administrativo
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight">Visão geral da loja</h2>
                        <p className="text-slate-300 text-sm md:text-base mt-2">
                            Bem-vindo de volta, {user?.name?.split(' ')[0] || 'admin'}. Acompanhe vendas, clientes, estoque e ações rápidas em um só lugar.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-3 text-xs">
                            <span className="rounded-full bg-white/10 border border-white/10 px-3 py-1.5 text-slate-200">Período: <strong className="text-white">{activeFilterLabel}</strong></span>
                            <span className="rounded-full bg-white/10 border border-white/10 px-3 py-1.5 text-slate-200">Ticket médio: <strong className="text-white">{formatCurrency(averageTicket)}</strong></span>
                            <span className="rounded-full bg-white/10 border border-white/10 px-3 py-1.5 text-slate-200">Estoque baixo: <strong className="text-white">{lowStockProducts.length}</strong></span>
                        </div>
                    </div>

                    <div className="flex flex-col justify-between gap-4 xl:min-w-[360px]">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl bg-white/10 border border-white/10 p-4 backdrop-blur">
                                <p className="text-xs uppercase tracking-wider text-slate-300 font-bold">Receita</p>
                                <p className="text-2xl font-black mt-1">{formatCurrency(totalRevenue)}</p>
                            </div>
                            <div className="rounded-2xl bg-white/10 border border-white/10 p-4 backdrop-blur">
                                <p className="text-xs uppercase tracking-wider text-slate-300 font-bold">Vendas</p>
                                <p className="text-2xl font-black mt-1">{totalSales}</p>
                            </div>
                        </div>
                        <div className="flex bg-white/10 p-1 rounded-2xl border border-white/10 shadow-sm backdrop-blur">
                            {Object.entries(FILTER_LABELS).map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => setActiveFilter(key)}
                                    className={`flex-1 px-3 py-2 text-xs font-black rounded-xl transition-all ${activeFilter === key ? 'bg-white text-slate-950 shadow-md' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {isLoadingData ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-200 shadow-sm">
                    <SpinnerIcon className="h-10 w-10 text-indigo-500 animate-spin"/>
                    <p className="text-sm text-slate-500 mt-4 font-semibold">Carregando indicadores...</p>
                </div>
            ) : (
                <>
                    {/* Cards de KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                        <StatCard 
                            title="Faturamento Total" 
                            value={formatCurrency(stats.totalRevenue)} 
                            growth={growth}
                            subtext="vs. período anterior"
                            icon={CurrencyDollarIcon}
                            iconBg="bg-green-100"
                            iconColor="text-green-600"
                            accent="from-green-50 to-white"
                        />
                        <StatCard 
                            title="Vendas Realizadas" 
                            value={stats.totalSales} 
                            icon={BoxIcon}
                            iconBg="bg-blue-100"
                            iconColor="text-blue-600"
                            subtext={`${activeFilterLabel}`}
                            accent="from-blue-50 to-white"
                        />
                        <StatCard 
                            title="Novos Clientes" 
                            value={stats.newCustomers} 
                            icon={UsersIcon}
                            iconBg="bg-purple-100"
                            iconColor="text-purple-600"
                            subtext="cadastros no período"
                            accent="from-purple-50 to-white"
                        />
                        <StatCard 
                            title="Pedidos Pendentes" 
                            value={stats.pendingOrders} 
                            icon={ClockIcon}
                            iconBg="bg-amber-100"
                            iconColor="text-amber-600"
                            subtext="aguardando ação"
                            accent="from-amber-50 to-white"
                        />
                    </div>

                    {/* Área Principal: Gráfico e Estoque */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Gráfico Principal */}
                        <div className="lg:col-span-2 bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-200">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
                                <div>
                                    <h3 className="font-black text-slate-900 text-xl">Performance de Vendas</h3>
                                    <p className="text-sm text-slate-500">Receita bruta ao longo do período selecionado</p>
                                </div>
                                <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-2">
                                    <p className="text-[10px] uppercase tracking-wider font-black text-indigo-500">Total do período</p>
                                    <p className="text-sm font-black text-indigo-900">{formatCurrency(totalRevenue)}</p>
                                </div>
                            </div>
                            <div className="h-80 w-full relative">
                                <canvas id="dailySalesChart" className={!hasDailySales ? 'opacity-20' : ''}></canvas>
                                {!hasDailySales && (
                                    <ChartEmptyState
                                        title="Sem faturamento no período"
                                        description="Quando houver vendas aprovadas, a curva de receita aparecerá aqui automaticamente."
                                    />
                                )}
                            </div>
                        </div>

                        {/* Widget Lateral */}
                        <div className="h-full">
                            <LowStockWidget />
                        </div>
                    </div>

                    {/* Área Inferior: Ações e Secundários */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Gráfico Secundário */}
                        <div className="lg:col-span-1 bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-200">
                            <div className="mb-5">
                                <h3 className="font-black text-slate-900 text-lg">Top Mais Vendidos</h3>
                                <p className="text-xs text-slate-500">Produtos com mais unidades vendidas</p>
                            </div>
                            <div className="h-64 relative">
                                <canvas id="bestSellersChart" className={!hasBestSellers ? 'opacity-20' : ''}></canvas>
                                {!hasBestSellers && (
                                    <ChartEmptyState
                                        title="Sem ranking ainda"
                                        description="Os produtos mais vendidos aparecem depois que houver pedidos no período."
                                    />
                                )}
                            </div>
                        </div>
                        
                        {/* Manutenção e Ações Rápidas */}
                        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-center">
                                <p className="text-xs uppercase tracking-wider text-slate-400 font-black mb-1">Operação</p>
                                <h3 className="font-black text-slate-900 text-lg mb-3">Status da Loja</h3>
                                <MaintenanceModeToggle />
                            </div>

                            <div className="bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900 p-6 rounded-3xl shadow-xl text-white border border-white/10">
                                <h3 className="font-black text-lg mb-4 flex items-center gap-2">
                                    <SparklesIcon className="h-5 w-5 text-amber-400"/> Ações Rápidas
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => onNavigate('admin/products')} className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl text-left transition-all hover:scale-[1.02] border border-white/10">
                                        <PlusIcon className="h-5 w-5 mb-2 text-green-400"/>
                                        <span className="text-xs font-bold block text-gray-200">Novo Produto</span>
                                    </button>
                                    <button onClick={() => onNavigate('admin/banners')} className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl text-left transition-all hover:scale-[1.02] border border-white/10">
                                        <PhotoIcon className="h-5 w-5 mb-2 text-blue-400"/>
                                        <span className="text-xs font-bold block text-gray-200">Banners</span>
                                    </button>
                                    <button onClick={() => handleStockExport('excel')} className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl text-left transition-all hover:scale-[1.02] border border-white/10">
                                        <FileIcon className="h-5 w-5 mb-2 text-amber-400"/>
                                        <span className="text-xs font-bold block text-gray-200">Rel. Estoque</span>
                                    </button>
                                    <button onClick={() => onNavigate('admin/coupons')} className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl text-left transition-all hover:scale-[1.02] border border-white/10">
                                        <TagIcon className="h-5 w-5 mb-2 text-pink-400"/>
                                        <span className="text-xs font-bold block text-gray-200">Cupom</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Seção de Exportação */}
                    <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-200">
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-5">
                            <div>
                                <p className="text-xs uppercase tracking-wider text-slate-400 font-black">Relatórios</p>
                                <h3 className="font-black text-slate-900 text-xl">Exportar dados</h3>
                                <p className="text-sm text-slate-500">Baixe relatórios para análise externa, contabilidade ou controle interno.</p>
                            </div>
                            <div className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 w-fit">
                                Arquivos gerados no navegador
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button 
                                onClick={() => handleSalesExport('excel')} 
                                className="group bg-green-50 hover:bg-green-600 text-green-700 hover:text-white py-4 px-4 rounded-2xl font-black flex items-center justify-between gap-2 transition-all border border-green-100 hover:border-green-600 shadow-sm"
                            >
                                <span>Vendas Excel</span>
                                <DownloadIcon className="h-5 w-5 group-hover:translate-y-0.5 transition-transform"/>
                            </button>
                            <button 
                                onClick={() => handleStockExport('excel')} 
                                className="group bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white py-4 px-4 rounded-2xl font-black flex items-center justify-between gap-2 transition-all border border-blue-100 hover:border-blue-600 shadow-sm"
                            >
                                <span>Estoque Excel</span>
                                <DownloadIcon className="h-5 w-5 group-hover:translate-y-0.5 transition-transform"/>
                            </button>
                            <button 
                                onClick={() => handleSalesExport('pdf')} 
                                className="group bg-red-50 hover:bg-red-600 text-red-700 hover:text-white py-4 px-4 rounded-2xl font-black flex items-center justify-between gap-2 transition-all border border-red-100 hover:border-red-600 shadow-sm"
                            >
                                <span>Vendas PDF</span>
                                <DownloadIcon className="h-5 w-5 group-hover:translate-y-0.5 transition-transform"/>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
