const BrandSplashSkeleton = () => {
    // Link da sua logo
    const logoUrl = "https://res.cloudinary.com/dvflxuxh3/image/upload/v1752292990/uqw1twmffseqafkiet0t.png";

    return (
        <div className="fixed inset-0 z-[9999] bg-white overflow-hidden flex items-center justify-center">
            {/* Fundo Estrutural (Skeleton) */}
            <div className="absolute inset-0 p-4 space-y-6 opacity-20 pointer-events-none select-none flex flex-col">
                <div className="flex justify-between items-center h-16 border-b border-gray-100">
                    <div className="h-6 w-32 bg-gray-300 rounded"></div>
                    <div className="flex gap-3">
                        <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
                        <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
                    </div>
                </div>
                <div className="w-full h-48 md:h-64 bg-gray-200 rounded-lg"></div>
                <div className="grid grid-cols-2 gap-4 flex-grow">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex flex-col space-y-2">
                            <div className="w-full aspect-square bg-gray-200 rounded-lg"></div>
                            <div className="h-3 w-3/4 bg-gray-200 rounded"></div>
                            <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Logo Central Pulsante */}
            <div className="relative z-10 flex flex-col items-center justify-center p-8 bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm">
                <img
                    src={logoUrl}
                    alt="Carregando..."
                    className="w-28 h-28 md:w-36 md:h-36 object-contain animate-pulse opacity-100 drop-shadow-md"
                />
            </div>
        </div>
    );
};