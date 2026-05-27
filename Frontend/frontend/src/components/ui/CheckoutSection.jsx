export const CheckoutSection = ({ title, step, children, icon: Icon }) => (
     <div className="bg-gray-900 rounded-lg border border-gray-800 shadow-md">
        <div className="flex items-center gap-3 p-4 border-b border-gray-700">
            {Icon && <Icon className="h-6 w-6 text-amber-400 flex-shrink-0"/>}
            <h2 className="text-xl font-bold text-amber-400 tracking-wide">{step ? `${step}. ` : ''}{title}</h2>
        </div>
        <div className="p-5">
            {children}
        </div>
    </div>
);
