import { ArrowUturnLeftIcon, CreditCardIcon, ShieldCheckIcon, TruckIcon } from '../icons';

export const BenefitsBar = () => (
    <div className="bg-gray-900 border-b border-gray-800 py-4 md:py-8">
        <div className="container mx-auto px-4">
            {/* Grid ajustado: 2 colunas no mobile, 4 no desktop */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
                {[
                    { icon: TruckIcon, title: "Frete Grátis", desc: "Acima de R$ 299", visibleOnMobile: true },
                    { icon: CreditCardIcon, title: "4x Sem Juros", desc: "No cartão de crédito", visibleOnMobile: true },
                    { icon: ShieldCheckIcon, title: "Compra Segura", desc: "Proteção de dados", visibleOnMobile: false },
                    { icon: ArrowUturnLeftIcon, title: "Troca Fácil", desc: "1ª troca grátis", visibleOnMobile: false },
                ].map((item, index) => (
                    <div 
                        key={index} 
                        className={`flex-col items-center text-center group p-3 rounded-lg bg-gray-800/30 md:bg-transparent md:hover:bg-gray-800/50 transition-all border border-gray-800 md:border-transparent ${item.visibleOnMobile ? 'flex' : 'hidden md:flex'}`}
                    >
                        <div className="p-2 md:p-3 bg-gray-800 rounded-full mb-2 md:mb-3 group-hover:bg-gray-700 transition-colors shadow-lg">
                            <item.icon className="h-5 w-5 md:h-6 md:w-6 text-amber-400 group-hover:scale-110 transition-transform" />
                        </div>
                        <h3 className="font-bold text-white text-xs md:text-sm uppercase tracking-wide whitespace-nowrap">{item.title}</h3>
                        <p className="text-[10px] md:text-xs text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    </div>
);
