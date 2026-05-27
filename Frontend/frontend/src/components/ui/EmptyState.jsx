export const EmptyState = ({ icon, title, message, buttonText, onButtonClick }) => (
    <div className="text-center py-10 sm:py-16 px-4">
        <div className="mx-auto w-fit p-4 bg-gray-800 rounded-full text-amber-400 mb-4">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400 mb-6">{message}</p>
        <button onClick={onButtonClick} className="bg-amber-500 text-black px-6 py-2 rounded-md hover:bg-amber-400 font-bold">
            {buttonText}
        </button>
    </div>
);
