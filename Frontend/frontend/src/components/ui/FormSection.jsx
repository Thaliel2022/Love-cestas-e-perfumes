export const FormSection = ({ title, icon: Icon, children }) => (
    <div className="bg-white p-5 md:p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-3">
            {Icon && <Icon className="h-5 w-5 text-indigo-600" />}
            {title}
        </h3>
        {children}
    </div>
);
