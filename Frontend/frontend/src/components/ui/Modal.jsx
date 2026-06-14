import { memo } from 'react';
import { motion } from 'framer-motion';

export const Modal = memo(({ isOpen, onClose, title, children, size = 'lg', dark = false }) => {
  if (!isOpen) return null;

  const backdropVariants = {
      visible: { opacity: 1 },
      hidden: { opacity: 0 }
  };

  const modalVariants = {
      hidden: { y: "-50vh", opacity: 0 },
      visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
      exit: { y: "50vh", opacity: 0 }
  };

  const sizeClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
      '3xl': 'max-w-3xl',
  };

  return (
    <motion.div 
      className={`fixed inset-0 z-50 flex justify-center items-center p-4 ${dark ? 'bg-black/80 backdrop-blur-sm' : 'bg-slate-900/60 backdrop-blur-sm'}`}
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      onClick={onClose}
    >
      <motion.div 
        className={`rounded-2xl shadow-2xl w-full flex flex-col ${sizeClasses[size]} ${
          dark
            ? 'bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-700'
            : 'bg-white border border-gray-200'
        }`}
        style={{ maxHeight: '90vh' }} 
        variants={modalVariants}
        onClick={e => e.stopPropagation()}
      >
        <div className={`flex-shrink-0 p-6 pb-4 flex justify-between items-center border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className={`text-xl md:text-2xl font-bold ${dark ? 'text-white' : 'text-gray-800'}`}>{title}</h2>
            <button onClick={onClose} className={`text-3xl leading-none transition-colors ${dark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-red-500'}`}>×</button>
        </div>
        <div className="flex-grow p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
});
