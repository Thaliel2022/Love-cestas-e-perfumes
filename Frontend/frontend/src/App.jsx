import React, { useState, useEffect, createContext, useContext, useCallback, memo, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// --- Constante da API ---
const API_URL = process.env.REACT_APP_API_URL || 'https://love-cestas-e-perfumes.onrender.com/api';

// --- ÍCONES SVG ---
const CartIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const HeartIcon = ({ className, filled }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.5l1.318-1.182a4.5 4.5 0 116.364 6.364L12 20.25l-7.682-7.682a4.5 4.5 0 010-6.364z" /></svg>;
const UserIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const AdminIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const MenuIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>;
const CloseIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const StarIcon = memo(({ className, isFilled, onClick }) => <svg onClick={onClick} xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} viewBox="0 0 20 20" fill={isFilled ? "currentColor" : "none"} stroke="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>);
const PlusIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>;
const TrashIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const EditIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>;
const ChartIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const BoxIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
const TruckIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8a1 1 0 001-1z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h2a1 1 0 001-1V6a1 1 0 00-1-1h-2v11z" /></svg>;
const UsersIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A6.995 6.995 0 0112 12a6.995 6.995 0 016-3.803M15 21a6 6 0 00-9-5.197" /></svg>;
const TagIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5a2 2 0 012 2v5a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zm0 0v11a2 2 0 002 2h5a2 2 0 002-2l-7-7z" /></svg>;
const FileIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
const UploadIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
const InstagramIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>;
const WhatsappIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 4.315 1.731 6.26l.16.288-1.035 3.803 3.91-1.019.28.169z"/></svg>;
const SearchIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const CheckCircleIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ExclamationIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const CreditCardIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
const SpinnerIcon = ({ className }) => <svg className={className || "h-5 w-5 animate-spin"} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
const ClockIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const PackageIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
const CheckBadgeIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>;
const HomeIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const XCircleIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CurrencyDollarIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 6v-1m0 1H9m3 0h3m-3 10v-1m0 1h3m-3 0H9m12-6a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const MapPinIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const CheckIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
const PlusCircleIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ExclamationCircleIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const DownloadIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
const ChevronDownIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>;
const ShirtIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 10.318a4.5 4.5 0 000 5.364L6.414 18H17.586l2.096-2.318a4.5 4.5 0 000-5.364L17.586 8H6.414L4.318 10.318zM12 8v10" /></svg>;
const RulerIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16M8 4v4m8-4v4" /></svg>;
const SparklesIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
const XMarkIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const EyeIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
const EyeOffIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7 .946-3.11 3.563-5.524 6.858-6.39M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.593 4.407A9.953 9.953 0 0121.542 12c-1.274 4.057-5.064 7-9.542 7a10.05 10.05 0 01-2.125-.3" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 1l22 22" /></svg>;
const SaleIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5a2 2 0 012 2v5a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const ShareIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.002L15.316 6.342a3 3 0 110 2.684m-6.632-2.684a3 3 0 000 2.684" /></svg>;
const ChevronUpIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>;
const CameraIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const BarsGripIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={className}><path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1Z M2 8a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1Zm0 5a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1Z" /></svg>;
const PixIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className={className}><path fill="#32BCAD" d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24ZM119.2 136.8a32 32 0 0 1 0-17.6l44-25.4a4 4 0 0 1 5.6 3.2V156a4 4 0 0 1-5.6 3.2Zm51.2 29.6-44-25.4a32 32 0 0 1-16.8 0l-44 25.4a8 8 0 0 1-9.6-7.2V96a8 8 0 0 1 9.6-7.2l44 25.4a32 32 0 0 1 16.8 0l44-25.4a8 8 0 0 1 9.6 7.2v64a8 8 0 0 1-9.6 7.2Z"/></svg>;
const VisaIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 122" className={className}><path fill="#142688" d="M379.3 1.8c-2.3-1-5.1-1.3-7.8-.8L10.3 35.5C4.5 37-1.3 42.6.4 48.7l28.9 104.4c1.7 6.1 7.5 10.3 13.8 10.3h288c5.1 0 9.8-3.1 11.8-7.7l37.1-85.1C387.8 59.8 381.6 2.8 379.3 1.8z"/><path fill="#ffffff" d="M285.3 49.3l-20.7 70.9-20.1-70.9h-18.3l29.4 94.4h20.6l29.4-94.4h-19.9zM191.7 49.3c-11.4 0-18.1 6.8-18.1 15.6 0 6.6 4.3 11.2 11.4 14.5l6.9 3.1c3.4 1.5 4.5 3.1 4.5 5.2 0 3.3-2.9 4.6-6.1 4.6-4.5 0-7.3-1.4-9.9-2.8l-1.9-1.1-2.1 12.1c2.8 1.4 6.7 2.4 11.2 2.4 12.3 0 19.3-6.4 19.3-16.4 0-7.3-4.5-12-12-15.3l-6.8-3c-3.1-1.4-4.4-2.8-4.4-4.9 0-2.1 2.2-3.8 5.7-3.8 3.6 0 6.1 1.2 8.3 2.3l1.5.8 2-11.6c-2.4-1.1-5.7-2-9.6-2zM337.3 49.3h-14.2c-2.7 0-4.5 1.1-5.2 3.8l-23.3 84.6h19.5l4-15.1h20.9l2.4 15.1h18.2L337.3 49.3zm-17.6 57.3l8.7-31.8 4.8 31.8h-13.5zM128.2 60.6c0-23.1 13-28.9 25.1-28.9 8.2 0 15.4 2.8 20.9 5.7l-4.2 15.3c-4-2.4-9.3-4.2-14.8-4.2-5.7 0-9.4 3-9.4 8s3.7 8 9.4 8c5.4 0 10.8-1.8 14.8-4.2l4.2 15.3c-5.5 2.9-12.7 5.7-20.9 5.7-12.1 0-25.1-5.7-25.1-28.9z"/></svg>;
const MastercardIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40" className={className}><circle cx="20" cy="20" r="20" fill="#EB001B"/><circle cx="40" cy="20" r="20" fill="#F79E1B"/><path d="M30 20a20 20 0 0 1-10 17.32a20 20 0 0 1 0-34.64A20 20 0 0 1 30 20z" fill="#FF5F00"/></svg>;
const EloIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 81 48" className={className}><circle cx="67.5" cy="24" r="13.5" fill="#FAB51A"/><path d="M40.5 48a24 24 0 1 1 0-48a24 24 0 0 1 0 48z" fill="#000"/><path d="M22.5 24a13.5 13.5 0 1 1-27 0a13.5 13.5 0 0 1 27 0z" fill="#FAB51A"/></svg>;
const BoletoIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className={className}><path fill="currentColor" d="M0 128c0-35.3 28.7-64 64-64H512c35.3 0 64 28.7 64 64v256c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V128zM128 160V352h32V160H128zm64 0V352h64V160H192zm96 0V352h32V160H288zm64 0V352h64V160H352zm96 0V352h32V160H448z"/></svg>;
const PhotoIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-3.69l-2.78-2.78a.75.75 0 0 0-1.06 0L12 12.69l-2.22-2.22a.75.75 0 0 0-1.06 0L1.5 11.06ZM15 7a1 1 0 1 1-2 0a1 1 0 0 1 2 0Z" clipRule="evenodd" /></svg>;
const ClipboardDocListIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path d="M5.5 16.5a1.5 1.5 0 0 1-1.5-1.5V5.75a.75.75 0 0 1 1.5 0v9.25a.25.25 0 0 0 .25.25h9.25a.75.75 0 0 1 0 1.5H5.5Z" /><path fillRule="evenodd" d="M8 3.5a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 8 15.5h9a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 17 3.5H8Zm3.75 4a.75.75 0 0 0-1.5 0v.5a.75.75 0 0 0 1.5 0v-.5ZM10.5 9.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Zm.03 2.5a.75.75 0 0 0-1.06 0l-.72.72a.75.75 0 0 0 1.06 1.06l.72-.72a.75.75 0 0 0 0-1.06Z" clipRule="evenodd" /></svg>;
const PaperAirplaneIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.949a.75.75 0 0 0 .135.252l.918.919a.75.75 0 0 1 0 1.06l-.918.92a.75.75 0 0 0-.135.252L2.28 16.76a.75.75 0 0 0 .95.826l14.666-4.954a.75.75 0 0 0 0-1.42L3.105 2.289Z" /></svg>;
const CurrencyDollarArrowIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clipRule="evenodd" /><path d="M8.293 6.293a1 1 0 0 1 1.414 0l2.5 2.5a1 1 0 0 1 0 1.414l-2.5 2.5a1 1 0 0 1-1.414-1.414L9.586 10 8.293 8.707a1 1 0 0 1 0-1.414Z" /></svg>;
const ArrowUturnLeftIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M15 10a.75.75 0 0 1-.75.75H7.707l2.293 2.293a.75.75 0 1 1-1.06 1.06l-3.5-3.5a.75.75 0 0 1 0-1.06l3.5-3.5a.75.75 0 0 1 1.06 1.06L7.707 9.25H14.25A.75.75 0 0 1 15 10Z" clipRule="evenodd" /></svg>;
const ShieldCheckIcon = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M10 1a.75.75 0 0 1 .75.75v1.252a1.75 1.75 0 0 1 2.476 1.222l.17.682a.75.75 0 0 1-1.42.354l-.17-.682a.25.25 0 0 0-.353-.175.75.75 0 0 1-.586 0 .25.25 0 0 0-.353.175l-.17.682a.75.75 0 0 1-1.42-.354l.17-.682A1.75 1.75 0 0 1 9.25 3.002V1.75A.75.75 0 0 1 10 1ZM5.113 4.634a.75.75 0 0 1 1.06 0l1.592 1.591a.75.75 0 0 1-1.06 1.06l-1.592-1.59a.75.75 0 0 1 0-1.061Zm8.714 0a.75.75 0 0 1 0 1.06l-1.591 1.591a.75.75 0 1 1-1.06-1.06l1.59-1.591a.75.75 0 0 1 1.061 0ZM10 4.25a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75ZM10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-2.207-6.207a1 1 0 0 1 1.414 0L10 12.586l.793-.793a1 1 0 1 1 1.414 1.414l-1.5 1.5a1 1 0 0 1-1.414 0l-2.5-2.5a1 1 0 0 1 0-1.414Z" clipRule="evenodd" /></svg>;

// --- FUNÇÕES AUXILIARES DE FORMATAÇÃO E VALIDAÇÃO ---
const validateCPF = (cpf) => {
    cpf = String(cpf).replace(/[^\d]/g, ''); 
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let sum = 0, remainder;
    for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;
    return true;
};

const maskCPF = (value) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .substring(0, 14);
};

const maskCEP = (value) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .substring(0, 9);
};

// --- SERVIÇO DE API (COM ABORTCONTROLLER) ---
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

async function apiService(endpoint, method = 'GET', body = null, options = {}) {
    const config = {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Essencial para enviar cookies httpOnly
        signal: options.signal,
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    try {
        const finalUrl = `${API_URL}${endpoint}`;
        const response = await fetch(finalUrl, config);
        const contentType = response.headers.get("content-type");
        
        let data;
        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            // Se o token expirou, tenta renová-lo
            if (response.status === 401 && data.message && data.message.includes('Token expirado')) {
                if (isRefreshing) {
                    return new Promise((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    }).then(() => apiService(endpoint, method, body, options));
                }

                isRefreshing = true;
                return new Promise((resolve, reject) => {
                    apiService('/refresh-token', 'POST')
                        .then(() => {
                            processQueue(null);
                            resolve(apiService(endpoint, method, body, options));
                        })
                        .catch(err => {
                            processQueue(err);
                            window.dispatchEvent(new Event('auth-error')); // Falha na renovação, desloga o usuário
                            reject(err);
                        })
                        .finally(() => {
                            isRefreshing = false;
                        });
                });
            }
             if (response.status === 401 || response.status === 403) {
                 window.dispatchEvent(new Event('auth-error'));
             }

            const errorMessage = (typeof data === 'object' && data.message) ? data.message : (data || `Erro ${response.status}`);
            throw new Error(errorMessage);
        }

        return data;

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`API fetch aborted: ${endpoint}`);
        } else {
            console.error(`Erro na API (${endpoint}):`, error);
        }
        if (error instanceof TypeError) {
            throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão e se o backend está rodando.');
        }
        throw error;
    }
}


async function apiUploadService(endpoint, file) {
    const formData = new FormData();
    formData.append('file', file);

    const config = {
        method: 'POST',
        credentials: 'include', // Adicionado para enviar cookies de autenticação
        body: formData,
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        const responseData = await response.json();
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                window.dispatchEvent(new Event('auth-error'));
            }
            throw new Error(responseData.message || `Erro ${response.status}`);
        }
        return responseData;
    } catch (error) {
        console.error(`Erro no upload (${endpoint}):`, error);
        throw error;
    }
}

async function apiImageUploadService(endpoint, file) {
    const formData = new FormData();
    formData.append('image', file);

    const config = {
        method: 'POST',
        credentials: 'include', // Adicionado para enviar cookies de autenticação
        body: formData,
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        const responseData = await response.json();
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                window.dispatchEvent(new Event('auth-error'));
            }
            throw new Error(responseData.message || `Erro ${response.status}`);
        }
        return responseData;
    } catch (error) {
        console.error(`Erro no upload da imagem (${endpoint}):`, error);
        throw error;
    }
}

// --- FUNÇÕES AUXILIARES PARA IMAGENS ---
const parseJsonString = (jsonString, fallbackValue) => {
    if (!jsonString || typeof jsonString !== 'string') {
        return fallbackValue;
    }
    try {
        const parsed = JSON.parse(jsonString);
        return parsed;
    } catch (e) {
        console.error("Falha ao parsear JSON:", jsonString, e);
        return fallbackValue;
    }
};

const getFirstImage = (imagesJsonString, placeholder = 'https://placehold.co/600x400/222/fff?text=Produto') => {
    const images = parseJsonString(imagesJsonString, []);
    return (Array.isArray(images) && images.length > 0) ? images[0] : placeholder;
};

// --- CONTEXTOS GLOBAIS ---
const AuthContext = createContext(null);
const ShopContext = createContext(null);
const NotificationContext = createContext(null);
const ConfirmationContext = createContext(null);

const useAuth = () => useContext(AuthContext);
const useShop = () => useContext(ShopContext);
const useNotification = () => useContext(NotificationContext);
const useConfirmation = () => useContext(ConfirmationContext);

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const logout = useCallback(async () => {
        try {
            await apiService('/logout', 'POST');
        } catch (error) {
            console.error("Erro na API de logout, limpando localmente de qualquer maneira.", error);
        } finally {
            localStorage.removeItem('user');
            setUser(null);
            // Redireciona para o login após garantir que tudo foi limpo
            window.location.hash = '#login';
        }
    }, []);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                localStorage.removeItem('user');
            }
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        const handleAuthError = () => {
            console.log("Erro de autenticação detectado. Deslogando usuário.");
            logout();
        };

        window.addEventListener('auth-error', handleAuthError);

        return () => {
            window.removeEventListener('auth-error', handleAuthError);
        };
    }, [logout]);

    const login = async (email, password) => {
        // A resposta agora não contém mais o token diretamente
        const response = await apiService('/login', 'POST', { email, password });
        if (response && response.user) {
            localStorage.setItem('user', JSON.stringify(response.user));
            setUser(response.user);
        }
        return response; // Retorna a resposta completa para a página de login
    };
    
    const register = async (name, email, password, cpf) => {
        return await apiService('/register', 'POST', { name, email, password, cpf });
    };

    return <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user, isLoading, setUser }}>{children}</AuthContext.Provider>;
};

const ShopProvider = ({ children }) => {
    const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
    const [cart, setCart] = useState([]);
    const [wishlist, setWishlist] = useState([]);
    
    const [addresses, setAddresses] = useState([]);
    const [shippingLocation, setShippingLocation] = useState({ cep: '', city: '', state: '', alias: '' });
    
    const [autoCalculatedShipping, setAutoCalculatedShipping] = useState(null);
    const [shippingOptions, setShippingOptions] = useState([]);
    const [isLoadingShipping, setIsLoadingShipping] = useState(false);
    const [shippingError, setShippingError] = useState('');
    const [previewShippingItem, setPreviewShippingItem] = useState(null);
    const [selectedShippingName, setSelectedShippingName] = useState(null);
    const [isGeolocating, setIsGeolocating] = useState(false);

    const [couponCode, setCouponCode] = useState("");
    const [couponMessage, setCouponMessage] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState(null);

    const fetchPersistentCart = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const dbCart = await apiService('/cart');
            setCart(dbCart || []);
        } catch (err) { console.error("Falha ao buscar carrinho persistente:", err); setCart([]); }
    }, [isAuthenticated]);

    const fetchAddresses = useCallback(async () => {
        if (!isAuthenticated) return [];
        try {
            // A chamada correta é apenas '/addresses'
            const userAddresses = await apiService('/addresses');
            setAddresses(userAddresses || []);
            return userAddresses || [];
        } catch (error) { console.error("Falha ao buscar endereços:", error); setAddresses([]); return []; }
    }, [isAuthenticated]);

    const updateDefaultShippingLocation = useCallback((addrs) => {
        const defaultAddr = addrs.find(addr => addr.is_default) || addrs[0];
        if (defaultAddr) {
            setShippingLocation({ cep: defaultAddr.cep, city: defaultAddr.localidade, state: defaultAddr.uf, alias: defaultAddr.alias });
            return true;
        }
        return false;
    }, []);

    const determineShippingLocation = useCallback(async () => {
        let locationDetermined = false;
        if (isAuthenticated) {
            const userAddresses = await fetchAddresses();
            if (userAddresses && userAddresses.length > 0) {
                locationDetermined = updateDefaultShippingLocation(userAddresses);
            }
        }
        if (!locationDetermined && navigator.geolocation) {
            setIsGeolocating(true);
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    try {
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                        const data = await response.json();
                        if (data.address && data.address.postcode) {
                            const cep = data.address.postcode.replace(/\D/g, '');
                            setShippingLocation({ cep, city: data.address.city || data.address.town || '', state: data.address.state || '', alias: 'Localização Atual' });
                        }
                    } catch (error) { console.warn("Não foi possível obter CEP da geolocalização.", error); } 
                    finally { setIsGeolocating(false); }
                }, 
                (error) => { 
                    console.warn("Geolocalização negada ou indisponível.", error.message);
                    setIsGeolocating(false);
                },
                { timeout: 10000 }
            );
        }
    }, [isAuthenticated, fetchAddresses, updateDefaultShippingLocation]);

    useEffect(() => {
        if (isAuthLoading) return;
        if (isAuthenticated) {
            fetchPersistentCart();
            determineShippingLocation();
            apiService('/wishlist').then(setWishlist).catch(console.error);
        } else {
            setCart([]); setWishlist([]); setAddresses([]); setShippingLocation({ cep: '', city: '', state: '', alias: '' });
            setAutoCalculatedShipping(null); setCouponCode(''); setAppliedCoupon(null); setCouponMessage('');
            determineShippingLocation();
        }
    }, [isAuthenticated, isAuthLoading, fetchPersistentCart, determineShippingLocation]);
    
    useEffect(() => {
        const itemsToCalculate = cart.length > 0 ? cart : previewShippingItem;

        const debounceTimer = setTimeout(() => {
            if (itemsToCalculate && itemsToCalculate.length > 0 && shippingLocation.cep.replace(/\D/g, '').length === 8) {
                setIsLoadingShipping(true);
                setShippingError('');
                
                const calculateShipping = async () => {
                    try {
                        const productsPayload = itemsToCalculate.map(item => ({
                            id: String(item.id),
                            price: item.is_on_sale && item.sale_price ? item.sale_price : item.price,
                            quantity: item.qty || 1,
                        }));
                        
                        const apiOptions = await apiService('/shipping/calculate', 'POST', { cep_destino: shippingLocation.cep, products: productsPayload });
                        
                        const pacOptionRaw = apiOptions.find(opt => opt.name.toLowerCase().includes('pac'));
                        const sedexOption = apiOptions.find(opt => opt.name.toLowerCase().includes('sedex'));

                        const shippingApiOptions = [];
                        if (pacOptionRaw) {
                            shippingApiOptions.push({ ...pacOptionRaw, name: 'PAC' });
                        } else if (sedexOption) {
                            shippingApiOptions.push(sedexOption);
                        }

                        const pickupOption = { name: "Retirar na loja", price: 0, delivery_time: 'Disponível para retirada após confirmação', isPickup: true };
                        
                        const finalOptions = [...shippingApiOptions, pickupOption];
                        setShippingOptions(finalOptions);
                        
                        const desiredOption = finalOptions.find(opt => opt.name === selectedShippingName);
                        const primaryShippingOption = shippingApiOptions[0];
                        
                        setAutoCalculatedShipping(desiredOption || primaryShippingOption || pickupOption || null);

                    } catch (error) {
                        setShippingError(error.message || 'Não foi possível calcular o frete.');
                        const pickupOption = { name: "Retirar na loja", price: 0, delivery_time: 'Disponível para retirada após confirmação', isPickup: true };
                        setShippingOptions([pickupOption]);
                        const desiredOption = pickupOption.name === selectedShippingName ? pickupOption : null;
                        setAutoCalculatedShipping(desiredOption || pickupOption);
                    } finally {
                        setIsLoadingShipping(false);
                    }
                };
                calculateShipping();
            } else {
                setShippingOptions([]);
                setAutoCalculatedShipping(null);
            }
        }, 500);
        return () => clearTimeout(debounceTimer);
    }, [cart, shippingLocation, previewShippingItem, selectedShippingName]);

    
    const addToCart = useCallback(async (productToAdd, qty = 1, variation = null) => {
        setPreviewShippingItem(null);
        const cartItemId = productToAdd.product_type === 'clothing' && variation ? `${productToAdd.id}-${variation.color}-${variation.size}` : productToAdd.id;
        const existing = cart.find(item => item.cartItemId === cartItemId);
        const availableStock = variation ? variation.stock : productToAdd.stock;
        const currentQtyInCart = existing ? existing.qty : 0;
        
        if (currentQtyInCart + qty > availableStock) throw new Error(`Estoque insuficiente. Apenas ${availableStock} unidade(s) disponível(ns).`);

        setCart(currentCart => {
            let updatedCart;
            if (existing) {
                updatedCart = currentCart.map(item => item.cartItemId === cartItemId ? { ...item, qty: item.qty + qty } : item);
            } else {
                updatedCart = [...currentCart, { ...productToAdd, qty, variation, cartItemId }];
            }

            if (isAuthenticated) {
                apiService('/cart', 'POST', { productId: productToAdd.id, quantity: existing ? existing.qty + qty : qty, variationId: variation?.id }).catch(console.error);
            }
            return updatedCart;
        });
    }, [cart, isAuthenticated]);
    
    const removeFromCart = useCallback(async (cartItemId) => {
        const itemToRemove = cart.find(item => item.cartItemId === cartItemId);
        if (!itemToRemove) return;
        const updatedCart = cart.filter(item => item.cartItemId !== cartItemId);
        setCart(updatedCart);
        if (isAuthenticated) await apiService(`/cart/${itemToRemove.id}`, 'DELETE', { variation: itemToRemove.variation });
    }, [cart, isAuthenticated]);

    const updateQuantity = useCallback(async (cartItemId, newQuantity) => {
        if (newQuantity < 1) { removeFromCart(cartItemId); return; }
        const itemToUpdate = cart.find(item => item.cartItemId === cartItemId);
        if (!itemToUpdate) return;
        const availableStock = itemToUpdate.variation ? itemToUpdate.variation.stock : itemToUpdate.stock;
        if (newQuantity > availableStock) throw new Error(`Estoque insuficiente. Apenas ${availableStock} unidade(s) disponível(ns).`);

        const updatedCart = cart.map(item => item.cartItemId === cartItemId ? {...item, qty: newQuantity } : item);
        setCart(updatedCart);
        if (isAuthenticated) await apiService('/cart', 'POST', { productId: itemToUpdate.id, quantity: newQuantity, variation: itemToUpdate.variation });
    }, [cart, isAuthenticated, removeFromCart]);
    
    const clearCart = useCallback(async () => { setCart([]); if (isAuthenticated) await apiService('/cart', 'DELETE'); }, [isAuthenticated]);

    const addToWishlist = useCallback(async (productToAdd) => {
        if (!isAuthenticated) return; 
        if (wishlist.some(p => p.id === productToAdd.id)) return;
        try {
            const addedProduct = await apiService('/wishlist', 'POST', { productId: productToAdd.id });
            setWishlist(current => [...current, addedProduct]);
            return { success: true, message: `${productToAdd.name} adicionado à lista de desejos!` };
        } catch (error) { console.error(error); return { success: false, message: `Não foi possível adicionar o item: ${error.message}` }; }
    }, [isAuthenticated, wishlist]);

    const removeFromWishlist = useCallback(async (productId) => {
        if (!isAuthenticated) return;
        try {
            await apiService(`/wishlist/${productId}`, 'DELETE');
            setWishlist(current => current.filter(p => p.id !== productId));
        } catch (error) { console.error(error); }
    }, [isAuthenticated]);
    
    const removeCoupon = useCallback(() => { setAppliedCoupon(null); setCouponCode(''); setCouponMessage(''); }, []);

    const applyCoupon = useCallback(async (code) => {
        setCouponCode(code);
        try {
            const response = await apiService('/coupons/validate', 'POST', { code });
            setAppliedCoupon(response.coupon);
            setCouponMessage(`Cupom "${response.coupon.code}" aplicado!`);
        } catch (error) { removeCoupon(); setCouponMessage(error.message || "Não foi possível aplicar o cupom."); }
    }, [removeCoupon]);
    
    const clearOrderState = useCallback(() => { clearCart(); removeCoupon(); determineShippingLocation(); }, [clearCart, removeCoupon, determineShippingLocation]);

    return (
        <ShopContext.Provider value={{
            cart, setCart, clearOrderState,
            wishlist, addToCart, 
            addToWishlist, removeFromWishlist,
            updateQuantity, removeFromCart,
            userName: user?.name,
            addresses, fetchAddresses,
            shippingLocation, setShippingLocation,
            autoCalculatedShipping, setAutoCalculatedShipping,
            shippingOptions, isLoadingShipping, shippingError,
            updateDefaultShippingLocation, determineShippingLocation,
            setPreviewShippingItem, 
            setSelectedShippingName,
            isGeolocating,
            couponCode, setCouponCode,
            couponMessage, applyCoupon, appliedCoupon, removeCoupon
        }}>
            {children}
        </ShopContext.Provider>
    );
};
const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const remove = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const show = useCallback((message, type = 'success', duration = 5000) => {
        const id = Date.now() + Math.random();
        setNotifications(prev => [...prev, { id, message, type }]);
        
        if (duration > 0) {
            setTimeout(() => {
                remove(id);
            }, duration);
        }
    }, [remove]);

    return (
        <NotificationContext.Provider value={{ show }}>
            {children}
            <div className="fixed bottom-5 right-5 z-[100] space-y-3">
                <AnimatePresence>
                    {notifications.map(n => 
                        <ToastMessage 
                            key={n.id} 
                            message={n.message} 
                            type={n.type}
                            onClose={() => remove(n.id)}
                        />
                    )}
                </AnimatePresence>
            </div>
        </NotificationContext.Provider>
    );
};

const ToastMessage = ({ message, type, onClose }) => {
    const typeClasses = {
        success: 'bg-green-500',
        error: 'bg-red-500',
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`pl-6 pr-10 py-4 rounded-lg shadow-xl text-white font-semibold flex items-center space-x-3 relative ${typeClasses[type]}`}
        >
            {type === 'success' ? <CheckCircleIcon className="h-6 w-6 flex-shrink-0"/> : <ExclamationIcon className="h-6 w-6 flex-shrink-0"/>}
            <span>{message}</span>
            <button 
                onClick={onClose} 
                className="absolute top-1/2 right-2 transform -translate-y-1/2 text-white/70 hover:text-white p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-white/50"
            >
                <CloseIcon className="h-5 w-5"/>
            </button>
        </motion.div>
    );
};

const ConfirmationProvider = ({ children }) => {
    const { user } = useAuth();
    const [confirmationState, setConfirmationState] = useState({ isOpen: false });
    const [verificationInput, setVerificationInput] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationError, setVerificationError] = useState('');

    const close = () => {
        setConfirmationState({ isOpen: false });
        setVerificationInput('');
        setVerificationError('');
        setIsVerifying(false);
    };

    const handleConfirm = async () => {
        const { onConfirm, requiresAuth } = confirmationState;

        if (requiresAuth) {
            setIsVerifying(true);
            setVerificationError('');
            try {
                const payload = user.is_two_factor_enabled 
                    ? { token: verificationInput } 
                    : { password: verificationInput };
                
                await apiService('/auth/verify-action', 'POST', payload);
                
                onConfirm();
                close();
            } catch (error) {
                setVerificationError(error.message || "Falha na verificação.");
            } finally {
                setIsVerifying(false);
            }
        } else {
            onConfirm();
            close();
        }
    };
    
    const show = useCallback((message, onConfirm, options = {}) => {
        setConfirmationState({
            isOpen: true,
            message,
            onConfirm,
            onCancel: close,
            requiresAuth: options.requiresAuth || false,
            confirmText: options.confirmText || 'Confirmar',
            confirmColor: options.confirmColor || 'bg-red-600 hover:bg-red-700',
        });
    }, []);

    const is2fa = user?.role === 'admin' && user?.is_two_factor_enabled;

    return (
        <ConfirmationContext.Provider value={{ show }}>
            {children}
            <AnimatePresence>
                {confirmationState.isOpen && (
                    <Modal isOpen={true} onClose={confirmationState.onCancel} title="Confirmação">
                        <p className="text-gray-700 mb-6">{confirmationState.message}</p>
                        
                        {confirmationState.requiresAuth && (
                            <div className="space-y-3 my-4 p-4 bg-gray-100 rounded-md border">
                                <label className="block text-sm font-medium text-gray-700">
                                    {is2fa ? "Código de Autenticação (2FA)" : "Confirme sua Senha"}
                                </label>
                                <input 
                                    type={is2fa ? "text" : "password"}
                                    value={verificationInput}
                                    onChange={(e) => setVerificationInput(e.target.value)}
                                    maxLength={is2fa ? 6 : undefined}
                                    placeholder={is2fa ? "123456" : "••••••••"}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                />
                                {verificationError && <p className="text-red-500 text-sm mt-1">{verificationError}</p>}
                            </div>
                        )}

                        <div className="flex justify-end space-x-4">
                            <button onClick={confirmationState.onCancel} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
                            <button 
                                onClick={handleConfirm} 
                                disabled={isVerifying}
                                className={`px-4 py-2 text-white rounded-md flex items-center justify-center disabled:opacity-50 ${confirmationState.confirmColor}`}
                            >
                                {isVerifying ? <SpinnerIcon /> : confirmationState.confirmText}
                            </button>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>
        </ConfirmationContext.Provider>
    );
};


// --- COMPONENTES DA UI ---
const Modal = memo(({ isOpen, onClose, title, children, size = 'lg' }) => {
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
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" 
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      onClick={onClose}
    >
      <motion.div 
        className={`bg-white rounded-lg shadow-xl w-full flex flex-col ${sizeClasses[size]}`} 
        style={{ maxHeight: '90vh' }} 
        variants={modalVariants}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-shrink-0 p-6 pb-4 flex justify-between items-center border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
            <button onClick={onClose} className="text-3xl text-gray-400 hover:text-gray-600 leading-none">&times;</button>
        </div>
        <div className="flex-grow p-6 overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
});

const TrackingModal = memo(({ isOpen, onClose, order }) => {
    const [trackingInfo, setTrackingInfo] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const isPickupOrder = order?.shipping_method === 'Retirar na loja';

    useEffect(() => {
        if (isOpen && order && !isPickupOrder && order.tracking_code) {
            const fetchTracking = async () => {
                setIsLoading(true);
                setError('');
                setTrackingInfo([]);
                try {
                    const data = await apiService(`/track/${order.tracking_code}`);
                    setTrackingInfo(data);
                } catch (err) {
                    setError(err.message || "Não foi possível obter informações de rastreio.");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchTracking();
        }
    }, [isOpen, order, isPickupOrder]);

    const renderPickupStatus = () => {
        let statusMessage;
        switch (order.status) {
            case 'Pronto para Retirada':
                statusMessage = (
                    <p className="flex items-center gap-2 text-green-700 font-semibold"><CheckCircleIcon className="h-5 w-5"/> Seu pedido já está separado e pronto para ser retirado!</p>
                );
                break;
            case 'Entregue':
                statusMessage = (
                    <p className="flex items-center gap-2 text-green-700 font-semibold"><CheckBadgeIcon className="h-5 w-5"/> Este pedido já foi retirado.</p>
                );
                break;
            case 'Reembolsado':
                statusMessage = (
                    <p className="flex items-center gap-2 text-gray-700 font-semibold"><CurrencyDollarIcon className="h-5 w-5"/> O pagamento para este pedido foi reembolsado.</p>
                );
                break;
            case 'Cancelado':
            case 'Pagamento Recusado':
                 statusMessage = (
                    <p className="flex items-center gap-2 text-red-700 font-semibold"><XCircleIcon className="h-5 w-5"/> Este pedido foi cancelado.</p>
                );
                break;
            default: // Pendente, Pagamento Aprovado, Separando Pedido
                statusMessage = (
                    <p className="flex items-center gap-2 text-amber-700 font-semibold"><ClockIcon className="h-5 w-5"/> Estamos preparando seu pedido. Você será notificado assim que estiver pronto.</p>
                );
        }

        return (
            <div className="space-y-6 text-gray-800">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Status Atual: <span className="text-blue-600">{order.status}</span></h3>
                    <div className="p-4 bg-gray-100 rounded-lg border">
                        {statusMessage}
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-gray-900 mb-2">Instruções para Retirada</h3>
                    <div className="text-sm bg-gray-100 p-4 rounded-lg border space-y-3">
                        <p><strong>Endereço:</strong><br/> R. Leopoldo Pereira Lima, 378 – Mangabeira VIII, João Pessoa – PB, 58059-123</p>
                        <p><strong>Horário:</strong><br/> Segunda a Sábado, das 9h às 11h30 e das 15h às 17h30 (exceto feriados).</p>
                        <p className="font-semibold pt-2 border-t">No momento da retirada, é necessário apresentar:</p>
                        <ul className="list-disc list-inside">
                            <li>Documento com foto (RG ou CNH)</li>
                            <li>O número do pedido: <span className="font-bold">#{order.id}</span></li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    };

    const renderShippingTracking = () => (
        <>
            {isLoading && <p>Buscando informações...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {!isLoading && !error && trackingInfo.length > 0 && (
                <div className="space-y-6">
                    {trackingInfo.map((event, index) => (
                        <div key={index} className="flex space-x-4">
                            <div className="flex flex-col items-center">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${index === 0 ? 'bg-amber-500' : 'bg-gray-300'}`}>
                                    {index === 0 && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                </div>
                                {index < trackingInfo.length - 1 && <div className="w-px h-full bg-gray-300"></div>}
                            </div>
                            <div>
                                <p className="font-bold text-gray-800">{event.status}</p>
                                <p className="text-sm text-gray-600">{event.location}</p>
                                <p className="text-xs text-gray-400">{new Date(event.date).toLocaleString('pt-BR')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
             {!isLoading && !error && trackingInfo.length === 0 && (
                <p>Nenhuma informação de rastreio disponível no momento.</p>
            )}
        </>
    );

    return (
        <AnimatePresence>
            {isOpen && order && (
                <Modal 
                    isOpen={isOpen} 
                    onClose={onClose} 
                    title={isPickupOrder ? `Status da Retirada: Pedido #${order.id}` : `Rastreio do Pedido: ${order.tracking_code}`}
                >
                    {isPickupOrder ? renderPickupStatus() : renderShippingTracking()}
                </Modal>
            )}
        </AnimatePresence>
    );
});

// --- COMPONENTE DO BOTÃO DE VOLTAR AO TOPO ---
const BackToTopButton = ({ scrollableRef }) => {
    const [isVisible, setIsVisible] = useState(false);

    const toggleVisibility = useCallback(() => {
        const target = scrollableRef?.current;
        let scrollTop = 0;
        if (target) {
            scrollTop = target.scrollTop; // Usa o scroll do elemento
        } else {
            scrollTop = window.pageYOffset; // Usa o scroll da página
        }

        if (scrollTop > 300) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [scrollableRef]);

    const scrollToTop = () => {
        const target = scrollableRef?.current;
        if (target) {
            target.scrollTo({ top: 0, behavior: 'smooth' }); // Rola o elemento
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola a página
        }
    };

    useEffect(() => {
        const target = scrollableRef?.current || window;
        
        // Garante que o target (elemento) exista antes de adicionar o listener
        if (target) {
            target.addEventListener('scroll', toggleVisibility);
            return () => {
                target.removeEventListener('scroll', toggleVisibility);
            };
        }
    }, [toggleVisibility, scrollableRef]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    onClick={scrollToTop}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed bottom-6 right-6 z-50 bg-amber-500 text-black p-3 rounded-full shadow-lg hover:bg-amber-400 transition-colors"
                    aria-label="Voltar ao topo"
                >
                    <ChevronUpIcon className="h-6 w-6" />
                </motion.button>
            )}
        </AnimatePresence>
    );
};

const ProductCard = memo(({ product, onNavigate }) => {
    const { addToCart, shippingLocation } = useShop(); 
    const notification = useNotification();
    const { user } = useAuth();
    const { wishlist, addToWishlist, removeFromWishlist } = useShop(); 
    const { isAuthenticated } = useAuth();

    const [isAddingToCart, setIsAddingToCart] = useState(false);
    // isBuyingNow não é mais necessário aqui, mas mantive para evitar quebras se usado em outro lugar
    const [isBuyingNow, setIsBuyingNow] = useState(false); 
    const [cardShippingInfo, setCardShippingInfo] = useState(null); 
    const [isCardShippingLoading, setIsCardShippingLoading] = useState(false); 
    
    // Novo estado para o tempo restante da promoção
    const [timeLeft, setTimeLeft] = useState('');
    
    // NOVO: Estado para controle local da promoção
    const [isPromoActive, setIsPromoActive] = useState(false);

    const imageUrl = useMemo(() => getFirstImage(product.images), [product.images]);

    // Atualiza estado local quando product muda
    useEffect(() => {
        setIsPromoActive(!!product.is_on_sale && product.sale_price > 0);
    }, [product]);

    // Lógica baseada no estado local
    const currentPrice = isPromoActive ? product.sale_price : product.price;

    const discountPercent = useMemo(() => {
        if (isPromoActive && product.price > 0) { 
            return Math.round(((product.price - product.sale_price) / product.price) * 100);
        }
        return 0;
    }, [isPromoActive, product]);

    // --- LÓGICA DO CONTADOR REGRESSIVO COM EXPIRAÇÃO AUTOMÁTICA ---
    useEffect(() => {
        if (!product?.sale_end_date) {
            setTimeLeft('');
            return;
        }

        // Se a promoção já foi desativada localmente, não roda o timer
        if (!isPromoActive) return;

        const calculateTimeLeft = () => {
            const difference = new Date(product.sale_end_date) - new Date();
            
            if (difference > 0) {
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                const seconds = Math.floor((difference / 1000) % 60);

                let timeString = '';
                if (days > 0) timeString += `${days}d `;
                timeString += `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                setTimeLeft(timeString);
            } else {
                // TEMPO ACABOU: Desativa promoção localmente
                setTimeLeft('Expirada');
                setIsPromoActive(false);
            }
        };

        calculateTimeLeft(); // Executa imediatamente
        const timer = setInterval(calculateTimeLeft, 1000); // Atualiza a cada segundo

        return () => clearInterval(timer);
    }, [isPromoActive, product.sale_end_date]);

    const isNew = useMemo(() => {
        if (!product || !product.created_at) return false;
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return new Date(product.created_at) > thirtyDaysAgo;
    }, [product]);

    const avgRating = product.avg_rating ? Math.round(product.avg_rating) : 0;
    const reviewCount = product.review_count || 0;

    const productVariations = useMemo(() => parseJsonString(product?.variations, []), [product]);
    const isProductOutOfStock = product.stock <= 0;
    const isVariationOutOfStock = product.product_type === 'clothing' && productVariations.length > 0 && productVariations.every(v => v.stock <= 0);
    const isOutOfStock = isProductOutOfStock || isVariationOutOfStock;

    // --- Efeito de Frete ---
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;
         const debounceTimer = setTimeout(() => {
            if (product && shippingLocation.cep.replace(/\D/g, '').length === 8) {
                setIsCardShippingLoading(true);
                setCardShippingInfo(null);

                const calculateShipping = async () => {
                    try {
                        const productsPayload = [{ id: String(product.id), price: currentPrice, quantity: 1 }];
                        const apiOptions = await apiService('/shipping/calculate', 'POST', { cep_destino: shippingLocation.cep, products: productsPayload }, { signal });

                        let shippingOption = apiOptions.find(opt => opt.name.toLowerCase().includes('pac'));
                        if (!shippingOption) {
                            shippingOption = apiOptions.find(opt => opt.name.toLowerCase().includes('sedex'));
                        }

                        if (shippingOption) {
                            const date = new Date();
                            let deliveryTime = shippingOption.delivery_time;
                            let addedDays = 0;
                            while (addedDays < deliveryTime) {
                                date.setDate(date.getDate() + 1);
                                if (date.getDay() !== 0 && date.getDay() !== 6) { addedDays++; }
                            }
                            const formattedDate = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
                            setCardShippingInfo(`Frete R$ ${Number(shippingOption.price).toFixed(2).replace('.', ',')} - Receba até ${formattedDate}.`);
                        } else {
                            setCardShippingInfo('Entrega indisponível para este CEP.');
                        }
                    } catch (error) {
                        if (error.name !== 'AbortError') {
                            setCardShippingInfo('Erro ao calcular frete.');
                        }
                    } finally {
                        if (!signal.aborted) { setIsCardShippingLoading(false); }
                    }
                };
                calculateShipping();
            } else {
                setCardShippingInfo(null); 
                 setIsCardShippingLoading(false); 
            }
        }, 500);

        return () => {
            clearTimeout(debounceTimer);
            controller.abort();
        };
    }, [product, shippingLocation.cep, currentPrice]); 

    const installmentInfo = useMemo(() => {
        if (currentPrice >= 100) {
            const installmentValue = currentPrice / 4;
            return `4x de R$ ${installmentValue.toFixed(2).replace('.', ',')} s/ juros`;
        }
        return null;
    }, [currentPrice]);

    // Função para ver detalhes (substitui o Comprar direto)
    const handleViewDetails = (e) => {
        e.stopPropagation();
        onNavigate(`product/${product.id}`);
    };

    // Função de Adicionar ao Carrinho (MANTIDA)
    const handleAddToCartInternal = async (e) => { 
        e.stopPropagation();
        if (product.product_type === 'clothing') {
            notification.show("Escolha cor e tamanho na página do produto.", "error");
            onNavigate(`product/${product.id}`);
            return;
        }
        setIsAddingToCart(true);
        try {
            await addToCart(product, 1);
            notification.show(`${product.name} adicionado ao carrinho!`);
        } catch (error) {
            notification.show(error.message || "Erro ao adicionar ao carrinho", "error");
        } finally {
            setIsAddingToCart(false);
        }
    };

    const WishlistButton = ({ product }) => {
        const isWishlisted = wishlist.some(item => item.id === product.id);
        const handleWishlistToggle = async (e) => {
            e.stopPropagation(); 
            if (!isAuthenticated) {
                notification.show("Faça login para adicionar à lista de desejos", "error");
                return;
            }
            if (isWishlisted) {
                await removeFromWishlist(product.id);
                notification.show(`${product.name} removido da lista de desejos.`, 'error');
            } else {
                const result = await addToWishlist(product);
                notification.show(result.message, result.success ? 'success' : 'error');
            }
        };
        return (
            <button
                onClick={handleWishlistToggle}
                className={`absolute top-2 right-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm p-1.5 rounded-full text-white transition-colors duration-200 z-10 ${isWishlisted ? 'text-amber-400' : 'hover:text-amber-300'}`}
                aria-label="Adicionar à Lista de Desejos"
            >
                <HeartIcon className="h-5 w-5" filled={isWishlisted} />
            </button>
        );
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    return (
        <motion.div
            layout 
            variants={cardVariants}
            initial="hidden" 
            animate="visible" 
            exit="hidden" 
            whileHover={{ y: -5, boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)" }}
            className={`bg-black border ${isPromoActive ? (timeLeft && timeLeft !== 'Expirada' ? 'border-red-600 shadow-lg shadow-red-900/30' : 'border-green-600 shadow-lg shadow-green-900/30') : 'border-gray-800'} rounded-lg overflow-hidden flex flex-col text-white h-full transition-shadow duration-300 ${isOutOfStock ? 'opacity-60 grayscale-[50%]' : ''}`} 
            onClick={() => onNavigate(`product/${product.id}`)} 
        >
            {/* --- Seção da Imagem --- */}
            <div className="relative h-64 bg-white overflow-hidden group">
                <img
                    src={imageUrl} 
                    alt={product.name}
                    className="w-full h-full object-contain cursor-pointer transition-transform duration-300 group-hover:scale-105 p-2"
                />
                <WishlistButton product={product} /> 

                {/* --- Badges/Selos --- */}
                <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
                    {isOutOfStock ? (
                        <div className="bg-gray-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow">ESGOTADO</div>
                    ) : isPromoActive ? (
                         <div className={`bg-gradient-to-r ${timeLeft && timeLeft !== 'Expirada' ? 'from-red-600 to-orange-500' : 'from-green-600 to-teal-500'} text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5`}> 
                            <SaleIcon className="h-4 w-4"/>
                            <span>PROMOÇÃO {discountPercent}%</span>
                        </div>
                    ) : isNew ? (
                        <div className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">LANÇAMENTO</div> 
                    ) : null}
                </div>

                {/* --- CONTADOR REGRESSIVO (OFERTA RELÂMPAGO) --- */}
                {isPromoActive && timeLeft && timeLeft !== 'Expirada' && !isOutOfStock && (
                    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-r from-red-700 to-red-500/90 backdrop-blur-md py-1.5 px-3 flex items-center justify-between z-20 shadow-inner border-t border-red-400">
                        <div className="flex items-center gap-1.5 text-white font-bold text-[10px] uppercase tracking-wide">
                            <SparklesIcon className="h-3 w-3 text-yellow-300 animate-pulse"/>
                            <span>Oferta Relâmpago</span>
                        </div>
                        <div className="flex items-center gap-1 bg-black/30 rounded px-1.5 py-0.5">
                            <ClockIcon className="h-3 w-3 text-white"/>
                            <span className="text-white font-mono font-bold text-xs">{timeLeft}</span>
                        </div>
                    </div>
                )}

                {/* --- BARRA DE DESTAQUE (PROMOÇÃO PADRÃO) --- */}
                {isPromoActive && (!timeLeft || timeLeft === 'Expirada') && !isOutOfStock && (
                    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-r from-emerald-600 to-green-500/95 backdrop-blur-md py-1.5 px-3 flex items-center justify-between z-20 shadow-inner border-t border-emerald-400/50">
                        <div className="flex items-center gap-1.5 text-white font-bold text-[10px] uppercase tracking-wide">
                            <TagIcon className="h-3 w-3 text-white fill-white"/>
                            <span>Preço Especial</span>
                        </div>
                        <div className="flex items-center gap-1 bg-black/20 rounded px-2 py-0.5">
                            <span className="text-white font-bold text-[9px]">Aproveite</span>
                        </div>
                    </div>
                )}

                 {product.product_type === 'clothing' && !isPromoActive && !isOutOfStock && (
                    <div className="absolute bottom-0 left-0 w-full bg-black/70 text-center text-xs py-1 text-amber-300"> 
                        Ver Cores e Tamanhos
                    </div>
                 )}
                 {user && user.role === 'admin' && (
                    <div className="absolute top-2 right-10 z-10"> 
                        <button onClick={(e) => { e.stopPropagation(); onNavigate(`admin/products?search=${encodeURIComponent(product.name)}`); }}
                                className="bg-gray-700/50 hover:bg-gray-600/70 backdrop-blur-sm text-white p-1.5 rounded-full shadow-md transition-colors" 
                                title="Editar Produto">
                            <EditIcon className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* --- Seção de Informações --- */}
            <div className="p-4 flex flex-col flex-grow">
                <div>
                    <p className="text-xs font-semibold text-amber-400 mb-1">{product.brand.toUpperCase()}</p>
                    <h4
                        className="text-base font-semibold tracking-tight cursor-pointer hover:text-amber-300 transition-colors line-clamp-2 h-10"
                        title={product.name}
                    >
                        {product.name}
                    </h4>
                    <div className="flex items-center mt-1.5 h-4 gap-1">
                        {[...Array(5)].map((_, i) => ( <StarIcon key={i} className={`h-4 w-4 ${i < avgRating ? 'text-amber-400' : 'text-gray-600'}`} isFilled={i < avgRating} /> ))}
                        {reviewCount > 0 && ( <span className="text-[10px] text-gray-500">({reviewCount})</span> )}
                    </div>
                </div>

                {/* --- Preço e Parcelas --- */}
                <div className="mt-auto pt-3">
                    {isPromoActive ? (
                         <div className="flex flex-col">
                            <p className="text-xs font-light text-gray-500 line-through">R$ {Number(product.price).toFixed(2).replace('.', ',')}</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-xl font-bold text-red-500">R$ {Number(product.sale_price).toFixed(2).replace('.', ',')}</p>
                                <span className={`text-xs font-bold ${timeLeft && timeLeft !== 'Expirada' ? 'text-red-500' : 'text-green-500'}`}>{discountPercent}% OFF</span>
                            </div>
                        </div>
                    ) : ( <p className="text-xl font-semibold text-white">R$ {Number(product.price).toFixed(2).replace('.', ',')}</p> )}

                    {installmentInfo && ( <p className="text-[11px] text-gray-400 mt-0.5">{installmentInfo}</p> )}

                    {/* --- Botões de Ação --- */}
                    {isOutOfStock ? (
                        <div className="mt-3">
                            <div className="w-full bg-gray-700 text-gray-400 py-2 px-3 rounded-md font-bold text-center text-sm">Esgotado</div>
                        </div>
                    ) : (
                        <div className="mt-3 flex items-stretch space-x-2">
                            {/* Botão Ver Detalhes (Substitui o Comprar Direto) */}
                            <button
                                onClick={handleViewDetails}
                                className="flex-grow bg-amber-400 text-black py-2 px-3 rounded-md hover:bg-amber-300 transition font-bold text-sm text-center flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                            >
                                <EyeIcon className="h-4 w-4"/>
                                Ver Detalhes
                            </button>
                            {/* Botão Adicionar ao Carrinho (Mantido) */}
                            <button
                                onClick={handleAddToCartInternal}
                                disabled={isAddingToCart}
                                title="Adicionar ao Carrinho"
                                className="flex-shrink-0 border border-gray-600 text-gray-400 p-2 rounded-md hover:bg-gray-700 hover:text-white transition flex items-center justify-center disabled:opacity-50"
                            >
                                {isAddingToCart ? <SpinnerIcon className="h-5 w-5 text-gray-400" /> : <CartIcon className="h-5 w-5"/>}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* --- Informação de Frete --- */}
            {(isCardShippingLoading || cardShippingInfo) && (
                <div className="p-2 text-[10px] text-center border-t border-gray-800 bg-gray-900/50 flex items-center justify-center gap-1.5">
                    {isCardShippingLoading ? (
                        <SpinnerIcon className="h-3 w-3 text-gray-500" />
                    ) : cardShippingInfo.includes('Erro') ? (
                         <ExclamationCircleIcon className="h-3 w-3 text-red-500" />
                    ) : (
                        <TruckIcon className="h-3 w-3 text-green-500"/>
                    )}
                    <span className={isCardShippingLoading ? "text-gray-500" : (cardShippingInfo.includes('Erro') ? 'text-red-400' : 'text-gray-400')}>
                        {isCardShippingLoading ? 'Calculando...' : cardShippingInfo}
                    </span>
                </div>
            )}
        </motion.div>
    );
});

const ProductCarousel = memo(({ products, onNavigate, title }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(4);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const minSwipeDistance = 50;

    const updateItemsPerPage = useCallback(() => {
        if (window.innerWidth < 640) setItemsPerPage(1);
        else if (window.innerWidth < 1024) setItemsPerPage(2);
        else setItemsPerPage(4);
    }, []);

    useEffect(() => {
        updateItemsPerPage();
        window.addEventListener('resize', updateItemsPerPage);
        return () => window.removeEventListener('resize', updateItemsPerPage);
    }, [updateItemsPerPage]);

    useEffect(() => {
        const maxIndex = Math.max(0, products.length - itemsPerPage);
        if (currentIndex > maxIndex) {
            setCurrentIndex(maxIndex);
        }
    }, [itemsPerPage, products, currentIndex]);

    const goNext = useCallback(() => {
        const maxIndex = Math.max(0, products.length - itemsPerPage);
        setCurrentIndex(prev => Math.min(prev + 1, maxIndex));
    }, [products.length, itemsPerPage]);

    const goPrev = useCallback(() => {
        setCurrentIndex(prev => Math.max(prev - 1, 0));
    }, []);

    if (!products || products.length === 0) {
        return null;
    }

    const canGoPrev = currentIndex > 0;
    const canGoNext = products.length > itemsPerPage && currentIndex < (products.length - itemsPerPage);

    const handleTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && canGoNext) {
            goNext();
        } else if (isRightSwipe && canGoPrev) {
            goPrev();
        }

        setTouchStart(null);
        setTouchEnd(null);
    };

    return (
        <div className="relative">
            {title && <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">{title}</h2>}
            <div
                className="overflow-hidden cursor-grab active:cursor-grabbing"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <motion.div
                    className="flex -mx-2 md:-mx-4" // Mantém align-items: stretch (padrão)
                    animate={{ x: `-${currentIndex * (100 / itemsPerPage)}%` }}
                    transition={{ type: 'spring', stiffness: 350, damping: 40 }}
                >
                    {products.map(product => (
                        <div
                            key={product.id}
                            className="flex-shrink-0 px-2 md:px-4" // REMOVIDO self-start
                            style={{ width: `${100 / itemsPerPage}%` }}
                        >
                            <ProductCard product={product} onNavigate={onNavigate} />
                        </div>
                    ))}
                </motion.div>
            </div>

            {products.length > itemsPerPage && (
                <>
                    <button onClick={goPrev} disabled={!canGoPrev} className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-2 md:-translate-x-4 bg-white/50 hover:bg-white text-black p-2 rounded-full shadow-lg disabled:opacity-30 disabled:cursor-not-allowed z-10 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={goNext} disabled={!canGoNext} className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-2 md:translate-x-4 bg-white/50 hover:bg-white text-black p-2 rounded-full shadow-lg disabled:opacity-30 disabled:cursor-not-allowed z-10 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </>
            )}
        </div>
    );
});


const Header = memo(({ onNavigate }) => {
    const { isAuthenticated, user, logout } = useAuth();
    const { cart, wishlist, addresses, shippingLocation, setShippingLocation, fetchAddresses } = useShop();
    const [searchTerm, setSearchTerm] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [activeMenu, setActiveMenu] = useState(null);
    const [mobileAccordion, setMobileAccordion] = useState(null);
    const [dynamicMenuItems, setDynamicMenuItems] = useState([]);
    const [currentPath, setCurrentPath] = useState(window.location.hash.slice(1) || 'home');

    // Estado para visibilidade da BottomNavBar
    const [isBottomNavVisible, setIsBottomNavVisible] = useState(true);
    const lastScrollY = useRef(0);
    const isScrollingDown = useRef(false);

    useEffect(() => {
        const handleHashChange = () => {
             setCurrentPath(window.location.hash.slice(1) || 'home');
        };
        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();
        return () => window.removeEventListener('hashchange', handleHashChange);
     }, []);

    // Efeito para controlar a visibilidade da BottomNavBar no scroll (APENAS IPHONE)
    useEffect(() => {
        // --- INÍCIO DA MODIFICAÇÃO ---
        // Função para verificar se é iPhone
        const isIOS = () => {
            return [
                'iPad Simulator',
                'iPhone Simulator',
                'iPod Simulator',
                'iPad',
                'iPhone',
                'iPod'
            ].includes(navigator.platform)
            // iPad on iOS 13 detection
            || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
        }

        const controlNavbar = () => {
            // Se NÃO for iOS, mantém a barra visível e sai da função
            if (!isIOS()) {
                 setIsBottomNavVisible(true);
                 isScrollingDown.current = false; // Garante que a lógica de scroll não interfira
                 lastScrollY.current = window.scrollY; // Atualiza a posição para evitar saltos se mudar de OS
                 return;
            }

            // Lógica original, agora executada APENAS se for iOS
            const currentScrollY = window.scrollY;
            const threshold = 5;

            if (window.innerWidth < 768) {
                if (currentScrollY > lastScrollY.current + threshold && !isScrollingDown.current) {
                    setIsBottomNavVisible(false);
                    isScrollingDown.current = true;
                } else if (currentScrollY < lastScrollY.current - threshold && isScrollingDown.current) {
                    setIsBottomNavVisible(true);
                    isScrollingDown.current = false;
                }
            } else {
                setIsBottomNavVisible(true);
                isScrollingDown.current = false;
            }

            lastScrollY.current = currentScrollY;
        };
        // --- FIM DA MODIFICAÇÃO ---

        window.addEventListener('scroll', controlNavbar);
        return () => {
            window.removeEventListener('scroll', controlNavbar);
        };
    }, []); // Dependência vazia, executa apenas uma vez

    const fetchAndBuildMenu = useCallback(() => {
        apiService('/collections')
            .then(data => {
                const groupedMenu = data.reduce((acc, category) => {
                    const section = category.menu_section;
                    if (!acc[section]) {
                        acc[section] = [];
                    }
                    acc[section].push({ name: category.name, filter: category.filter });
                    return acc;
                }, {});

                const menuOrder = ['Perfumaria', 'Roupas', 'Conjuntos', 'Moda Íntima', 'Calçados', 'Acessórios'];
                const finalMenuStructure = menuOrder
                    .filter(sectionName => groupedMenu[sectionName])
                    .map(sectionName => ({
                        name: sectionName,
                        sub: groupedMenu[sectionName]
                    }));
                setDynamicMenuItems(finalMenuStructure);
            })
            .catch(err => {
                console.error("Falha ao construir o menu dinâmico:", err);
                setDynamicMenuItems([]);
            });
    }, []);

    useEffect(() => {
        fetchAndBuildMenu();
    }, [fetchAndBuildMenu]);

    useEffect(() => {
        if (isMobileMenuOpen && dynamicMenuItems.length === 0) {
            console.log("Menu móvel aberto, mas sem itens. Tentando buscar categorias novamente...");
            fetchAndBuildMenu();
        }
    }, [isMobileMenuOpen, dynamicMenuItems, fetchAndBuildMenu]);

    const totalCartItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const prevTotalCartItems = useRef(totalCartItems);
    const cartAnimationControls = useAnimation();

    useEffect(() => {
        if (totalCartItems > prevTotalCartItems.current) {
            cartAnimationControls.start({
                scale: [1, 1.25, 0.9, 1.1, 1],
                transition: { duration: 0.5, times: [0, 0.25, 0.5, 0.75, 1] }
            });
        }
        prevTotalCartItems.current = totalCartItems;
    }, [totalCartItems, cartAnimationControls]);

    useEffect(() => {
        if (searchTerm.length < 1) {
            setSearchSuggestions([]);
            return;
        }
        const debounceTimer = setTimeout(() => {
            apiService(`/products/search-suggestions?q=${searchTerm}`)
                .then(data => setSearchSuggestions(data))
                .catch(err => console.error(err));
        }, 300);
        return () => clearTimeout(debounceTimer);
    }, [searchTerm]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            onNavigate(`products?search=${encodeURIComponent(searchTerm.trim())}`);
            setSearchTerm('');
            setSearchSuggestions([]);
            setIsMobileMenuOpen(false);
        }
    };

    const handleSuggestionClick = (productId) => {
        onNavigate(`product/${productId}`);
        setSearchTerm('');
        setSearchSuggestions([]);
        setIsSearchFocused(false);
        setIsMobileMenuOpen(false);
    };

    const dropdownVariants = {
        open: { opacity: 1, y: 0, display: 'block', transition: { duration: 0.2 } },
        closed: { opacity: 0, y: -20, transition: { duration: 0.2 }, transitionEnd: { display: 'none' } }
    };

    const mobileMenuVariants = {
        open: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
        closed: { x: "-100%", transition: { type: 'spring', stiffness: 300, damping: 30 } },
    };

    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    const [manualCep, setManualCep] = useState('');
    const [cepError, setCepError] = useState('');

    useEffect(() => {
        if (isAddressModalOpen && isAuthenticated) {
            fetchAddresses();
        }
    }, [isAddressModalOpen, isAuthenticated, fetchAddresses]);

    const handleSelectAddress = (addr) => {
        setShippingLocation({ cep: addr.cep, city: addr.localidade, state: addr.uf, alias: addr.alias });
        setIsAddressModalOpen(false);
    };

    const handleManualCepSubmit = async (e) => {
        e.preventDefault();
        setCepError('');
        const cleanCep = manualCep.replace(/\D/g, '');
        if (cleanCep.length !== 8) { setCepError("CEP inválido."); return; }
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await response.json();
            if (data.erro) { setCepError("CEP não encontrado."); } else {
                setShippingLocation({ cep: manualCep, city: data.localidade, state: data.uf, alias: `CEP ${manualCep}` });
                setIsAddressModalOpen(false);
                setManualCep('');
            }
        } catch { setCepError("Não foi possível buscar o CEP."); }
    };

    const handleCepInputChange = (e) => {
        setManualCep(maskCEP(e.target.value));
        if (cepError) setCepError('');
    };

    let addressDisplay = 'Selecione um endereço';
    if (shippingLocation && shippingLocation.cep) {
        const cleanCep = shippingLocation.cep.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            const formattedCep = cleanCep.replace(/(\d{5})(\d{3})/, '$1-$2');
            const displayCityState = [shippingLocation.city, shippingLocation.state].filter(Boolean).join(' - ');
            let prefix = 'Enviar para';

            if (shippingLocation.alias && !shippingLocation.alias.startsWith('CEP ') && shippingLocation.alias !== 'Localização Atual') {
                prefix = `Enviar para ${shippingLocation.alias} -`;
            } else if (isAuthenticated && user?.name) {
                prefix = `Enviar para ${user.name.split(' ')[0]} -`;
            }

            if (displayCityState) {
                addressDisplay = `${prefix} ${displayCityState} ${formattedCep}`;
            } else {
                 addressDisplay = `${prefix} ${formattedCep}`;
            }
        }
    }

    // Componente da Barra de Navegação Inferior (Mobile)
    const BottomNavBar = () => {
        const wishlistCount = wishlist.length;

        const navVariants = {
            visible: { y: 0, transition: { type: "tween", duration: 0.3, ease: "easeOut" } },
            hidden: { y: "100%", transition: { type: "tween", duration: 0.3, ease: "easeIn" } }
        };

        return (
            <motion.div
                className="fixed bottom-0 left-0 right-0 h-16 bg-black border-t border-gray-800 flex justify-around items-center z-40 md:hidden"
                initial={false}
                animate={isBottomNavVisible ? "visible" : "hidden"}
                variants={navVariants}
            >
                <button onClick={() => { onNavigate('home'); setIsMobileMenuOpen(false); }} className={`flex flex-col items-center justify-center transition-colors w-1/5 ${currentPath === 'home' || currentPath === '' ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'}`}>
                    <HomeIcon className="h-6 w-6 mb-1"/>
                    <span className="text-xs">Início</span>
                </button>
                <button onClick={() => { isAuthenticated ? onNavigate('account') : onNavigate('login'); setIsMobileMenuOpen(false); }} className={`flex flex-col items-center justify-center transition-colors w-1/5 ${currentPath.startsWith('account') || currentPath === 'login' ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'}`}>
                    <UserIcon className="h-6 w-6 mb-1"/>
                    <span className="text-xs">Conta</span>
                </button>
                <button onClick={() => { onNavigate('wishlist'); setIsMobileMenuOpen(false); }} className={`relative flex flex-col items-center justify-center transition-colors w-1/5 ${currentPath === 'wishlist' ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'}`}>
                    <HeartIcon className="h-6 w-6 mb-1"/>
                    <span className="text-xs">Lista</span>
                    {wishlistCount > 0 && <span className="absolute top-0 right-[25%] bg-amber-400 text-black text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">{wishlistCount}</span>}
                </button>
                <button onClick={() => { onNavigate('cart'); setIsMobileMenuOpen(false); }} className={`relative flex flex-col items-center justify-center transition-colors w-1/5 ${currentPath === 'cart' ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'}`}>
                    <motion.div animate={cartAnimationControls}>
                        <CartIcon className="h-6 w-6 mb-1"/>
                    </motion.div>
                    <span className="text-xs">Carrinho</span>
                    {totalCartItems > 0 && <span className="absolute top-0 right-[25%] bg-amber-400 text-black text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">{totalCartItems}</span>}
                </button>
                <button onClick={() => setIsMobileMenuOpen(true)} className={`flex flex-col items-center justify-center transition-colors w-1/5 ${isMobileMenuOpen ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'}`}>
                    <MenuIcon className="h-6 w-6 mb-1"/>
                    <span className="text-xs">Menu</span>
                </button>
            </motion.div>
        );
    };

    return (
        <>
        <AnimatePresence>
            {isAddressModalOpen && (
                <Modal isOpen={true} onClose={() => setIsAddressModalOpen(false)} title="Selecionar Endereço de Entrega" size="md">
                    <div className="space-y-4">
                        {isAuthenticated && addresses && addresses.length > 0 && addresses.map(addr => (
                             <div key={addr.id} onClick={() => handleSelectAddress(addr)} className="p-4 border-2 rounded-lg cursor-pointer transition-all bg-gray-50 hover:border-amber-400 hover:bg-amber-50">
                                 <p className="font-bold text-gray-800">{addr.alias} {addr.is_default ? <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full ml-2">Padrão</span> : ''}</p>
                                 <p className="text-sm text-gray-600">{addr.logradouro}, {addr.numero} - {addr.bairro}</p>
                                 <p className="text-sm text-gray-500">{addr.localidade} - {addr.uf}</p>
                             </div>
                        ))}
                         {isAuthenticated && addresses.length === 0 && (
                            <p className="text-sm text-center text-gray-500 py-4">Nenhum endereço cadastrado...</p>
                         )}
                         {!isAuthenticated && (
                            <p className="text-sm text-center text-gray-500 py-4">Faça login para usar seus endereços...</p>
                         )}
                        <div className="pt-4 border-t">
                            <form onSubmit={handleManualCepSubmit} className="space-y-2">
                                 <label className="block text-sm font-medium text-gray-700">Calcular frete para um CEP</label>
                                 <div className="flex gap-2">
                                    <input type="text" value={manualCep} onChange={handleCepInputChange} placeholder="00000-000" className="w-full p-2 border border-gray-300 rounded-md text-gray-900" />
                                    <button type="submit" className="bg-gray-800 text-white font-bold px-4 rounded-md hover:bg-black">OK</button>
                                 </div>
                                 {cepError && <p className="text-red-500 text-xs mt-1">{cepError}</p>}
                            </form>
                        </div>
                    </div>
                </Modal>
            )}
        </AnimatePresence>

        <header className="bg-black/80 backdrop-blur-md text-white shadow-lg sticky top-0 z-40">
            {/* Top Bar - Desktop */}
            <div className="hidden md:block px-4 sm:px-6">
                <div className="flex justify-between items-center py-3">
                    <a href="#home" onClick={(e) => { e.preventDefault(); onNavigate('home'); }} className="text-xl font-bold tracking-wide text-amber-400">LovecestasePerfumes</a>
                    <div className="hidden lg:block flex-1 max-w-2xl mx-8">
                         <form onSubmit={handleSearchSubmit} className="relative">
                           <input
                                type="text" value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                placeholder="O que você procura?"
                                className="w-full bg-gray-800 text-white px-5 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500"/>
                           <button type="submit" className="absolute right-0 top-0 h-full px-4 text-gray-400 hover:text-amber-400"><SearchIcon className="h-5 w-5" /></button>
                            <AnimatePresence>
                            {isSearchFocused && searchTerm.length > 0 && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                                        <div className="max-h-96 overflow-y-auto">
                                            {searchSuggestions.length > 0 ? (
                                                searchSuggestions.map(p => (
                                                    <div key={p.id} onClick={() => handleSuggestionClick(p.id)} className="flex items-center p-3 hover:bg-gray-100 cursor-pointer transition-colors border-b last:border-b-0">
                                                        <img src={getFirstImage(p.images)} alt={p.name} className="w-16 h-16 object-contain mr-4 rounded-md bg-white p-1 border" />
                                                        <div className="flex-grow">
                                                            <p className="font-semibold text-gray-800">{p.name}</p>
                                                            {p.is_on_sale && p.sale_price > 0 ? (
                                                                <div className="flex items-baseline gap-2">
                                                                    <p className="text-red-600 font-bold">R$ {Number(p.sale_price).toFixed(2)}</p>
                                                                    <p className="text-gray-500 text-sm line-through">R$ {Number(p.price).toFixed(2)}</p>
                                                                </div>
                                                            ) : (
                                                                <p className="text-gray-700 font-bold">R$ {Number(p.price).toFixed(2)}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : ( <p className="p-4 text-center text-sm text-gray-500">Nenhum produto encontrado.</p> )}
                                        </div>
                                        {searchTerm.trim() && ( <button type="submit" className="w-full text-center p-3 bg-gray-50 hover:bg-gray-100 text-amber-600 font-semibold transition-colors"> Ver todos os resultados para "{searchTerm}" </button> )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </form>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        {isAuthenticated && ( <button onClick={() => onNavigate('account/orders')} className="hidden sm:flex items-center gap-1 hover:text-amber-400 transition px-2 py-1"> <PackageIcon className="h-6 w-6"/> <div className="flex flex-col items-start text-xs leading-tight"> <span>Devoluções</span> <span className="font-bold">& Pedidos</span> </div> </button> )}
                        <button onClick={() => onNavigate('wishlist')} className="relative flex items-center gap-1 hover:text-amber-400 transition px-2 py-1"> <HeartIcon className="h-6 w-6"/> <span className="hidden sm:inline text-sm font-medium">Lista</span> {wishlist.length > 0 && <span className="absolute top-0 right-0 bg-amber-400 text-black text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">{wishlist.length}</span>} </button>
                        <motion.button animate={cartAnimationControls} onClick={() => onNavigate('cart')} className="relative flex items-center gap-1 hover:text-amber-400 transition px-2 py-1"> <CartIcon className="h-6 w-6"/> <span className="hidden sm:inline text-sm font-medium">Carrinho</span> {totalCartItems > 0 && <span className="absolute top-0 right-0 bg-amber-400 text-black text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">{totalCartItems}</span>} </motion.button>
                        <div className="hidden sm:block">
                            {isAuthenticated ? (
                                <div className="relative group">
                                   <button className="flex items-start gap-1 hover:text-amber-400 transition px-2 py-1 leading-none"> <UserIcon className="h-6 w-6 mt-0.5"/> <div className="flex flex-col items-start text-xs"> <span>Olá, {user.name.split(' ')[0]}</span> <span className="font-bold text-sm">Conta</span> </div> </button>
                                   <div className="absolute top-full right-0 w-48 bg-gray-900 rounded-md shadow-lg py-1 z-20 invisible group-hover:visible border border-gray-800"> <span className="block px-4 py-2 text-sm text-gray-400">Olá, {user.name}</span> <a href="#account" onClick={(e) => { e.preventDefault(); onNavigate('account'); }} className="block px-4 py-2 text-sm text-white hover:bg-gray-800">Minha Conta</a> {user.role === 'admin' && <a href="#admin" onClick={(e) => { e.preventDefault(); onNavigate('admin/dashboard');}} className="block px-4 py-2 text-sm text-amber-400 hover:bg-gray-800">Painel Admin</a>} <a href="#logout" onClick={(e) => {e.preventDefault(); logout(); onNavigate('home');}} className="block px-4 py-2 text-sm text-white hover:bg-gray-800">Sair</a> </div>
                                </div>
                            ) : ( <button onClick={() => onNavigate('login')} className="flex items-center gap-1 bg-amber-400 text-black px-4 py-2 rounded-md hover:bg-amber-300 transition font-bold"> <UserIcon className="h-5 w-5"/> <span className="text-sm">Login</span> </button> )}
                        </div>
                    </div>
                </div>
            </div>

             <div className="block md:hidden px-4 pt-3">
                <div className="text-center mb-2"> <a href="#home" onClick={(e) => { e.preventDefault(); onNavigate('home'); }} className="text-xl font-bold tracking-wide text-amber-400">LovecestasePerfumes</a> </div>
                <form onSubmit={handleSearchSubmit} className="relative mb-2">
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onFocus={() => setIsSearchFocused(true)} onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)} placeholder="Pesquisar em LovecestasePerfumes" className="w-full bg-gray-800 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm" />
                    <button type="submit" className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-amber-400"><SearchIcon className="h-5 w-5" /></button>
                    <AnimatePresence>
                        {isSearchFocused && searchTerm.length > 0 && (
                             <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                                <div className="max-h-60 overflow-y-auto">
                                    {searchSuggestions.length > 0 ? (
                                        searchSuggestions.map(p => (
                                            <div key={p.id} onClick={() => handleSuggestionClick(p.id)} className="flex items-center p-2 hover:bg-gray-100 cursor-pointer transition-colors border-b last:border-b-0"> <img src={getFirstImage(p.images)} alt={p.name} className="w-12 h-12 object-contain mr-3 rounded-md bg-white p-1 border" /> <div className="flex-grow"> <p className="font-semibold text-gray-800 text-sm">{p.name}</p> {p.is_on_sale && p.sale_price > 0 ? ( <p className="text-red-600 font-bold text-xs">R$ {Number(p.sale_price).toFixed(2)}</p> ) : ( <p className="text-gray-700 font-bold text-xs">R$ {Number(p.price).toFixed(2)}</p> )} </div> </div>
                                        ))
                                    ) : ( <p className="p-4 text-center text-sm text-gray-500">Nenhum produto encontrado.</p> )}
                                </div>
                                {searchTerm.trim() && ( <button type="submit" className="w-full text-center p-2 bg-gray-50 hover:bg-gray-100 text-amber-600 font-semibold transition-colors text-sm"> Ver todos os resultados </button> )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </form>
                 <button onClick={() => setIsAddressModalOpen(true)} className="w-full flex items-center text-xs text-gray-300 bg-gray-800/50 px-3 py-2 rounded-md cursor-pointer hover:bg-gray-700/50 transition-colors text-left"> <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0 text-amber-400"/> <span className="truncate flex-grow">{addressDisplay}</span> <ChevronDownIcon className="h-4 w-4 ml-auto flex-shrink-0"/> </button>
            </div>

            <nav className="hidden md:flex justify-center px-4 sm:px-6 h-12 items-center border-t border-gray-800 relative" onMouseLeave={() => setActiveMenu(null)}>
                <a href="#home" onClick={(e) => { e.preventDefault(); onNavigate('home'); }} className="px-4 py-2 text-sm font-semibold tracking-wider uppercase hover:text-amber-400 transition-colors">Início</a>
                <div className="h-full flex items-center" onMouseEnter={() => setActiveMenu('Coleções')}> <button className="px-4 py-2 text-sm font-semibold tracking-wider uppercase hover:text-amber-400 transition-colors">Coleções</button> </div>
                <a href="#products?promo=true" onClick={(e) => { e.preventDefault(); onNavigate('products?promo=true'); }} className="px-4 py-2 text-sm font-semibold tracking-wider uppercase text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"> <SaleIcon className="h-4 w-4" /> Promoções </a>
                <a href="#ajuda" onClick={(e) => { e.preventDefault(); onNavigate('ajuda'); }} className="px-4 py-2 text-sm font-semibold tracking-wider uppercase hover:text-amber-400 transition-colors">Ajuda</a>
                <AnimatePresence>
                    {activeMenu === 'Coleções' && (
                        <motion.div initial="closed" animate="open" exit="closed" variants={dropdownVariants} className="absolute top-full left-0 w-full bg-gray-900/95 backdrop-blur-sm shadow-2xl border-t border-gray-700">
                            <div className="container mx-auto p-8 grid grid-cols-6 gap-8">
                                {dynamicMenuItems.map(cat => ( cat && cat.sub && ( <div key={cat.name}> <h3 className="font-bold text-amber-400 mb-3 text-base">{cat.name}</h3> <ul className="space-y-2"> {cat.sub.map(subCat => ( <li key={subCat.name}><a href="#" onClick={(e) => { e.preventDefault(); onNavigate(`products?category=${subCat.filter}`); setActiveMenu(null); }} className="block text-sm text-white hover:text-amber-300 transition-colors">{subCat.name}</a></li> ))} </ul> </div> ) ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
                        <motion.div variants={mobileMenuVariants} initial="closed" animate="open" exit="closed" className="fixed top-0 left-0 h-screen w-4/5 max-w-sm bg-gray-900 z-[60] flex flex-col">
                            <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-gray-800"> <h2 className="font-bold text-amber-400">Menu</h2> <button onClick={() => setIsMobileMenuOpen(false)}><CloseIcon className="h-6 w-6 text-white" /></button> </div>
                            <div className="flex-grow overflow-y-auto p-4">
                                {dynamicMenuItems.map((cat, index) => ( cat && cat.sub && ( <div key={cat.name} className="border-b border-gray-800"> <button onClick={() => setMobileAccordion(mobileAccordion === index ? null : index)} className="w-full flex justify-between items-center py-3 text-left font-bold text-white"> <span>{cat.name}</span> <ChevronDownIcon className={`h-5 w-5 transition-transform ${mobileAccordion === index ? 'rotate-180' : ''}`} /> </button> <AnimatePresence> {mobileAccordion === index && ( <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pl-4 pb-2 space-y-2 overflow-hidden"> {cat.sub.map(subCat => ( <li key={subCat.name}><a href="#" onClick={(e) => { e.preventDefault(); onNavigate(`products?category=${subCat.filter}`); setIsMobileMenuOpen(false); }} className="block text-sm text-gray-300 hover:text-amber-300">{subCat.name}</a></li> ))} </motion.ul> )} </AnimatePresence> </div> ) ))}
                                <div className="border-b border-gray-800"> <a href="#products?promo=true" onClick={(e) => { e.preventDefault(); onNavigate('products?promo=true'); setIsMobileMenuOpen(false); }} className="flex items-center gap-2 py-3 font-bold text-red-400 hover:text-red-300"> <SaleIcon className="h-5 w-5"/> Promoções </a> </div>
                                <div className="border-b border-gray-800"> <a href="#products" onClick={(e) => { e.preventDefault(); onNavigate('products'); setIsMobileMenuOpen(false); }} className="block py-3 font-bold text-white hover:text-amber-400">Ver Tudo</a> </div>
                                <div className="border-b border-gray-800"> <a href="#ajuda" onClick={(e) => { e.preventDefault(); onNavigate('ajuda'); setIsMobileMenuOpen(false); }} className="block py-3 font-bold text-white hover:text-amber-400">Ajuda</a> </div>
                                <div className="pt-4 space-y-3">
                                    {isAuthenticated ? ( <> <a href="#account" onClick={(e) => { e.preventDefault(); onNavigate('account'); setIsMobileMenuOpen(false); }} className="block text-white hover:text-amber-400">Minha Conta</a> <a href="#account/orders" onClick={(e) => { e.preventDefault(); onNavigate('account/orders'); setIsMobileMenuOpen(false); }} className="block text-white hover:text-amber-400">Devoluções e Pedidos</a> {user.role === 'admin' && <a href="#admin" onClick={(e) => { e.preventDefault(); onNavigate('admin/dashboard'); setIsMobileMenuOpen(false);}} className="block text-amber-400 hover:text-amber-300">Painel Admin</a>} <button onClick={() => { logout(); onNavigate('home'); setIsMobileMenuOpen(false); }} className="w-full text-left text-white hover:text-amber-400">Sair</button> </> ) : ( <button onClick={() => { onNavigate('login'); setIsMobileMenuOpen(false); }} className="w-full text-left bg-amber-400 text-black px-4 py-2 rounded-md hover:bg-amber-300 transition font-bold">Login</button> )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </header>

        {/* Renderiza a BottomNavBar */}
        <BottomNavBar />
        </>
    );
});

const CollectionsCarousel = memo(({ onNavigate, title }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(6);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const minSwipeDistance = 50;
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        apiService('/collections')
            .then(data => setCategories(data)) // Apenas define os dados na ordem recebida
            .catch(err => console.error("Falha ao buscar coleções:", err))
            .finally(() => setIsLoading(false));
    }, []);

    const updateItemsPerPage = useCallback(() => {
        if (window.innerWidth < 640) setItemsPerPage(2);
        else if (window.innerWidth < 768) setItemsPerPage(3);
        else if (window.innerWidth < 1024) setItemsPerPage(4);
        else setItemsPerPage(6);
    }, []);

    useEffect(() => {
        updateItemsPerPage();
        window.addEventListener('resize', updateItemsPerPage);
        return () => window.removeEventListener('resize', updateItemsPerPage);
    }, [updateItemsPerPage]);

    const goNext = useCallback(() => {
        const maxIndex = Math.max(0, categories.length - itemsPerPage);
        setCurrentIndex(prev => Math.min(prev + 1, maxIndex));
    }, [categories.length, itemsPerPage]);

    const goPrev = useCallback(() => {
        setCurrentIndex(prev => Math.max(prev - 1, 0));
    }, []);

    if (isLoading) {
        return (
            <section className="bg-black text-white py-12 md:py-16">
                <div className="container mx-auto px-4">
                    {title && <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">{title}</h2>}
                    <div className="animate-pulse flex justify-center items-center h-48">
                        <SpinnerIcon className="h-8 w-8 text-amber-500" />
                    </div>
                </div>
            </section>
        );
    }

    if (!categories || categories.length === 0) return null;

    const canGoPrev = currentIndex > 0;
    const canGoNext = categories.length > itemsPerPage && currentIndex < (categories.length - itemsPerPage);

    const handleTouchStart = (e) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
    const handleTouchMove = (e) => { setTouchEnd(e.targetTouches[0].clientX); };
    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        if (distance > minSwipeDistance && canGoNext) goNext();
        else if (distance < -minSwipeDistance && canGoPrev) goPrev();
        setTouchStart(null);
        setTouchEnd(null);
    };

    return (
        <section className="bg-black text-white py-12 md:py-16">
            <div className="container mx-auto px-4">
                {title && <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">{title}</h2>}
                <div className="relative">
                    <div 
                        className="overflow-hidden"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        <motion.div
                            className="flex -mx-2"
                            animate={{ x: `-${currentIndex * (100 / itemsPerPage)}%` }}
                            transition={{ type: 'spring', stiffness: 350, damping: 40 }}
                        >
                            {categories.map(cat => (
                                <div 
                                    key={cat.name} 
                                    className="flex-shrink-0 px-2"
                                    style={{ width: `${100 / itemsPerPage}%` }}
                                >
                                    <div className="relative rounded-lg overflow-hidden aspect-[4/5] group cursor-pointer" onClick={() => onNavigate(`products?category=${cat.filter}`)}>
                                        <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-2 transition-all group-hover:bg-black/60">
                                            <h3 className="text-xl font-semibold text-white text-center tracking-wide" style={{ textShadow: '2px 2px 6px rgba(0,0,0,0.9)' }}>{cat.name}</h3>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                    {canGoPrev && (
                        <button onClick={goPrev} className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-2 md:-translate-x-4 bg-white/50 hover:bg-white text-black p-2 rounded-full shadow-lg z-10 hidden md:flex">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                    )}
                    {canGoNext && (
                         <button onClick={goNext} className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-2 md:translate-x-4 bg-white/50 hover:bg-white text-black p-2 rounded-full shadow-lg z-10 hidden md:flex">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
});

// --- PÁGINAS DO CLIENTE ---
const HomePage = ({ onNavigate }) => {
const [products, setProducts] = useState({
        newArrivals: [],
        bestSellers: [],
        clothing: [],
        perfumes: []
    });

    useEffect(() => {
        apiService('/products')
            .then(data => {
                const sortedByDate = [...data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                const sortedBySales = [...data].sort((a, b) => (b.sales || 0) - (a.sales || 0));
                
                const clothingProducts = data.filter(p => p.product_type === 'clothing');
                const perfumeProducts = data.filter(p => p.product_type === 'perfume');

                setProducts({
                    newArrivals: sortedByDate,
                    bestSellers: sortedBySales,
                    clothing: clothingProducts,
                    perfumes: perfumeProducts
                });
            })
            .catch(err => console.error("Falha ao buscar produtos:", err));
    }, []);

    return (
      <>
        <BannerCarousel onNavigate={onNavigate} />
        
        <CollectionsCarousel onNavigate={onNavigate} title="Coleções" />

        <section className="bg-black text-white py-12 md:py-16">
          <div className="container mx-auto px-4">
              <ProductCarousel products={products.newArrivals} onNavigate={onNavigate} title="Novidades"/>
          </div>
        </section>
        
        <section className="bg-black text-white py-12 md:py-16">
          <div className="container mx-auto px-4">
             <ProductCarousel products={products.bestSellers} onNavigate={onNavigate} title="Mais Vendidos"/>
          </div>
        </section>
        
        <section className="bg-black text-white py-12 md:py-16">
          <div className="container mx-auto px-4">
              <ProductCarousel products={products.clothing} onNavigate={onNavigate} title="Roupas"/>
          </div>
        </section>

      {products.perfumes.length > 0 && (
            <section className="bg-black text-white py-12 md:py-16">
                <div className="container mx-auto px-4">
                    <ProductCarousel products={products.perfumes} onNavigate={onNavigate} title="Perfumes"/>
                </div>
            </section>
        )}
      </>
    );
};

// ===== ATUALIZAÇÃO PROMOÇÕES =====
const ProductsPage = ({ onNavigate, initialSearch = '', initialCategory = '', initialBrand = '', initialIsPromo = false }) => {
    const [allProducts, setAllProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [filters, setFilters] = useState({ search: initialSearch, brand: initialBrand, category: initialCategory });
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [uniqueCategories, setUniqueCategories] = useState([]);
    const productsPerPage = 12;

    useEffect(() => {
        const controller = new AbortController();
        setIsLoading(true);
        
        Promise.all([
            apiService('/products', 'GET', null, { signal: controller.signal }),
            apiService('/collections', 'GET', null, { signal: controller.signal })
        ]).then(([productsData, collectionsData]) => {
            setAllProducts(productsData);
            // Cria uma lista única de categorias a partir das coleções ativas
            const activeCategories = collectionsData.map(cat => cat.filter);
            setUniqueCategories([...new Set(activeCategories)].sort());
        }).catch(err => {
            if (err.name !== 'AbortError') console.error("Falha ao buscar dados da página de produtos:", err);
        }).finally(() => {
            setIsLoading(false);
        });

        return () => controller.abort();
    }, []);
    
    useEffect(() => {
        setFilters(prev => ({...prev, search: initialSearch, category: initialCategory, brand: initialBrand}));
    }, [initialSearch, initialCategory, initialBrand]);

    useEffect(() => {
        let result = [...allProducts];

        if (initialIsPromo) {
            result = result.filter(p => p.is_on_sale);
        }

        if (filters.search) {
            result = result.filter(p => 
                p.name.toLowerCase().includes(filters.search.toLowerCase()) || 
                p.brand.toLowerCase().includes(filters.search.toLowerCase())
            );
        }
        if (filters.brand) {
            result = result.filter(p => p.brand === filters.brand);
        }
        if (filters.category) {
            result = result.filter(p => p.category === filters.category);
        }
        setFilteredProducts(result);
        setCurrentPage(1);
    }, [filters, allProducts, initialIsPromo]);
    
    const uniqueBrands = [...new Set(allProducts.map(p => p.brand))];
    const indexOfLastProduct = currentPage * productsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
    const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    
    const ProductSkeleton = () => (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden flex flex-col h-full animate-pulse">
            <div className="h-64 bg-gray-700"></div>
            <div className="p-5 flex-grow flex flex-col">
                <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
                <div className="h-6 bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="h-5 bg-gray-700 rounded w-1/2 mb-auto"></div>
                <div className="h-8 bg-gray-700 rounded w-1/3 mt-4"></div>
                <div className="mt-4 flex items-stretch space-x-2">
                    <div className="h-10 bg-gray-700 rounded flex-grow"></div>
                    <div className="h-10 w-12 bg-gray-700 rounded"></div>
                </div>
            </div>
        </div>
    );
    
    const gridContainerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const pageTitle = initialIsPromo ? 'Produtos em Promoção' : 'Nossa Coleção';

    return (
        <div className="bg-black text-white py-12 min-h-screen">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{pageTitle}</h2>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <aside className="lg:col-span-1 bg-gray-900 p-6 rounded-lg shadow-md h-fit lg:sticky lg:top-28">
                        <h3 className="text-xl font-bold mb-4 text-amber-400">Filtros</h3>
                        <div className="space-y-4">
                            <input type="text" placeholder="Buscar por nome..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
                             <select value={filters.brand} onChange={e => setFilters({...filters, brand: e.target.value})} className="w-full p-2 bg-gray-800 border border-gray-700 rounded">
                                <option value="">Todas as Marcas</option>
                                {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                            <select value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})} className="w-full p-2 bg-gray-800 border border-gray-700 rounded">
                                <option value="">Todas as Categorias</option>
                                {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </aside>
                    <main className="lg:col-span-3">
                        <motion.div 
                            variants={gridContainerVariants}
                            initial="hidden"
                            animate="visible"
                            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                        >
                           {isLoading ? (
                                Array.from({ length: 6 }).map((_, i) => <ProductSkeleton key={i} />)
                            ) : currentProducts.length > 0 ? (
                                currentProducts.map(p => <ProductCard key={p.id} product={p} onNavigate={onNavigate} />)
                            ) : (
                                <p className="col-span-full text-center text-gray-500">Nenhum produto encontrado para sua busca.</p>
                            )}
                        </motion.div>
                        {totalPages > 1 && (
                            <div className="flex justify-center mt-8 items-center space-x-2 sm:space-x-4">
                                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-3 sm:px-4 py-2 bg-gray-800 rounded disabled:opacity-50">Anterior</button>
                                <span className="text-sm sm:text-base">Página {currentPage} de {totalPages}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 sm:px-4 py-2 bg-gray-800 rounded disabled:opacity-50">Próxima</button>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};
// ===================================

const InstallmentModal = memo(({ isOpen, onClose, installments }) => {
    if (!isOpen || !installments || installments.length === 0) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Opções de Parcelamento">
            <div className="space-y-3">
                {installments.map(p => (
                    <div key={p.installments} className="flex justify-between items-center p-3 border border-gray-200 rounded-md transition-colors hover:bg-gray-50">
                        <div>
                            <p className="font-bold text-lg text-gray-800">{p.recommended_message.replace('.', ',')}</p>
                            <p className="text-sm text-gray-500">Total: R$ {p.total_amount.toFixed(2).replace('.', ',')}</p>
                        </div>
                        {p.installment_rate === 0 ? (
                            <span className="text-sm font-semibold text-green-600 bg-green-100 px-3 py-1 rounded-full whitespace-nowrap">Sem juros</span>
                        ) : (
                             <span className="text-sm font-semibold text-orange-600 bg-orange-100 px-3 py-1 rounded-full whitespace-nowrap">Com juros</span>
                        )}
                    </div>
                ))}
            </div>
            <p className="text-xs text-gray-500 mt-6 text-center">Você poderá escolher o número de parcelas na hora de fechar a compra.</p>
        </Modal>
    );
});

const ShippingCalculator = memo(({ items: itemsFromProp }) => {
    const { 
        cart,
        addresses, 
        shippingLocation, 
        setShippingLocation,
        shippingOptions,
        isLoadingShipping,
        shippingError,
        autoCalculatedShipping,
        setAutoCalculatedShipping,
        setPreviewShippingItem,
        setSelectedShippingName,
        isGeolocating // <-- NOVO ESTADO
    } = useShop();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [manualCep, setManualCep] = useState('');
    const [apiError, setApiError] = useState('');

    useEffect(() => {
        const isProductPage = cart.length === 0 && itemsFromProp && itemsFromProp.length > 0;
        if (isProductPage) {
            setPreviewShippingItem(itemsFromProp);
        }
        return () => {
            if (isProductPage) {
                setPreviewShippingItem(null);
            }
        };
    }, [itemsFromProp, cart.length, setPreviewShippingItem]);
    
    const handleSelectShipping = (option) => {
        setAutoCalculatedShipping(option);
        setSelectedShippingName(option.name);
    };

    const handleSelectAddress = (addr) => {
        setShippingLocation({ cep: addr.cep, city: addr.localidade, state: addr.uf, alias: addr.alias });
        setIsModalOpen(false);
    };

    const handleManualCepSubmit = async (e) => {
        e.preventDefault();
        setApiError('');
        const cleanCep = manualCep.replace(/\D/g, '');
        if (cleanCep.length !== 8) { setApiError("CEP inválido."); return; }
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await response.json();
            if (data.erro) { setApiError("CEP não encontrado."); } else {
                setShippingLocation({ cep: manualCep, city: data.localidade, state: data.uf, alias: `CEP ${manualCep}` });
                setIsModalOpen(false);
                setManualCep('');
            }
        } catch { setApiError("Não foi possível buscar o CEP."); }
    };
    
    const handleCepInputChange = (e) => {
        setManualCep(maskCEP(e.target.value));
        if (apiError) setApiError('');
    };

    const getDeliveryDate = (deliveryTime) => {
        if (!deliveryTime || isNaN(deliveryTime)) return 'Prazo indisponível';
        const date = new Date();
        let addedDays = 0;
        while (addedDays < deliveryTime) {
            date.setDate(date.getDate() + 1);
            if (date.getDay() !== 0 && date.getDay() !== 6) addedDays++;
        }
        return `Previsão de entrega para ${date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}`;
    };

    return (
        <>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Alterar Endereço de Entrega" size="md">
                <div className="space-y-4">
                    {addresses && addresses.length > 0 && addresses.map(addr => (
                         <div key={addr.id} onClick={() => handleSelectAddress(addr)} className="p-4 border-2 rounded-lg cursor-pointer transition-all bg-gray-50 hover:border-amber-400 hover:bg-amber-50">
                             <p className="font-bold text-gray-800">{addr.alias}</p>
                             <p className="text-sm text-gray-600">{addr.logradouro}, {addr.numero} - {addr.bairro}</p>
                         </div>
                    ))}
                    <div className="pt-4 border-t">
                        <form onSubmit={handleManualCepSubmit} className="space-y-2">
                             <label className="block text-sm font-medium text-gray-700">Calcular frete para um novo CEP</label>
                             <div className="flex gap-2">
                                <input type="text" value={manualCep} onChange={handleCepInputChange} placeholder="00000-000" className="w-full p-2 border border-gray-300 rounded-md text-gray-900" />
                                <button type="submit" className="bg-gray-800 text-white font-bold px-4 rounded-md hover:bg-black">OK</button>
                             </div>
                             {apiError && <p className="text-red-500 text-xs mt-1">{apiError}</p>}
                        </form>
                    </div>
                </div>
            </Modal>

            <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
                <div className="min-h-[60px]">
                    {shippingLocation.cep.replace(/\D/g, '').length === 8 ? (
                        <>
                            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-4">
                                <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-300">
                                    <MapPinIcon className="h-5 w-5 flex-shrink-0 text-amber-400" />
                                    <span className="truncate">Opções para {shippingLocation.cep}</span>
                                </div>
                                <button onClick={() => setIsModalOpen(true)} className="text-amber-400 hover:underline flex-shrink-0 text-sm font-semibold">
                                    Alterar
                                </button>
                            </div>
                            {isLoadingShipping && <div className="flex items-center gap-2 animate-pulse"><SpinnerIcon className="h-5 w-5 text-amber-400" /><span className="text-gray-400">Calculando...</span></div>}
                            {!isLoadingShipping && shippingError && (<div className="text-red-400 text-sm">{shippingError}</div>)}
                            {!isLoadingShipping && shippingOptions.length > 0 && (
                                <div className="space-y-3">
                                    {shippingOptions.map(option => (
                                        <div key={option.name} onClick={() => handleSelectShipping(option)} className={`flex items-center justify-between p-3 rounded-md border-2 transition-all cursor-pointer ${autoCalculatedShipping?.name === option.name ? 'border-amber-400 bg-amber-900/40' : 'border-gray-700 hover:bg-gray-800'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-5 h-5 flex items-center justify-center">
                                                    <div className={`w-4 h-4 rounded-full border-2 ${autoCalculatedShipping?.name === option.name ? 'border-amber-400' : 'border-gray-500'}`}>
                                                        {autoCalculatedShipping?.name === option.name && <div className="w-full h-full p-0.5"><div className="w-full h-full rounded-full bg-amber-400"></div></div>}
                                                    </div>
                                                </div>
                                                <div className="text-gray-300">{option.isPickup ? <BoxIcon className="h-6 w-6"/> : <TruckIcon className="h-6 w-6"/>}</div>
                                                <div>
                                                    <p className="font-semibold text-white">{option.name}</p>
                                                    <p className="text-xs text-gray-400">
                                                        {option.isPickup ? option.delivery_time : getDeliveryDate(option.delivery_time)}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="font-bold text-lg text-amber-400">{option.price > 0 ? `R$ ${option.price.toFixed(2)}` : 'Grátis'}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!isLoadingShipping && shippingOptions.length === 0 && !shippingError && (
                                <div><p className="text-gray-400 text-sm">Nenhuma opção de entrega encontrada para este CEP.</p></div>
                            )}
                        </>
                    ) : (
                        isGeolocating ? (
                            <div className="flex items-center gap-2 animate-pulse py-4">
                                <SpinnerIcon className="h-5 w-5 text-amber-400" />
                                <span className="text-gray-400 text-sm">Obtendo sua localização para calcular o frete...</span>
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm font-medium text-gray-200 mb-2">Calcular frete e prazo</p>
                                <form onSubmit={handleManualCepSubmit} className="flex gap-2">
                                    <input type="text" value={manualCep} onChange={handleCepInputChange} placeholder="Digite seu CEP" className="w-full p-2 bg-gray-800 border-gray-700 border rounded-md text-white"/>
                                    <button type="submit" className="bg-amber-400 text-black font-bold px-4 rounded-md hover:bg-amber-300">Calcular</button>
                                </form>
                                {apiError && <p className="text-red-500 text-xs mt-1">{apiError}</p>}
                            </div>
                        )
                    )}
                </div>
            </div>
        </>
    );
});
const VariationSelector = ({ product, variations, onSelectionChange }) => {
    const [selectedColor, setSelectedColor] = useState('');
    const [selectedSize, setSelectedSize] = useState('');

    const uniqueColors = useMemo(() => {
        const colors = new Map();
        if (!variations || !product) return [];

        variations.forEach(v => {
            if (v.color && !colors.has(v.color)) {
                const primaryImage = (v.images && v.images.length > 0) 
                    ? v.images[0] 
                    : getFirstImage(product.images);
                colors.set(v.color, primaryImage);
            }
        });
        return Array.from(colors, ([name, image]) => ({ name, image }));
    }, [variations, product]);

    const allSizesForColor = useMemo(() => {
        if (!selectedColor) return [];
        const sizeMap = new Map();
        variations
            .filter(v => v.color === selectedColor)
            .forEach(v => {
                const currentStock = sizeMap.get(v.size)?.stock || 0;
                sizeMap.set(v.size, { size: v.size, stock: currentStock + v.stock });
            });
        return Array.from(sizeMap.values());
    }, [variations, selectedColor]);

    useEffect(() => {
        const fullSelection = (selectedColor && selectedSize)
            ? variations.find(v => v.color === selectedColor && v.size === selectedSize)
            : null;
        onSelectionChange(fullSelection, selectedColor);
    }, [selectedColor, selectedSize, variations, onSelectionChange]);

    const handleColorChange = (color) => {
        setSelectedColor(color);
        const sizesForNewColor = variations
            .filter(v => v.color === color && v.stock > 0)
            .map(v => v.size);
        
        if (sizesForNewColor.length === 1) {
            setSelectedSize(sizesForNewColor[0]);
        } else {
            setSelectedSize('');
        }
    };
    
    return (
        <div className="space-y-6">
            <div>
                 <h3 className="text-lg font-semibold text-gray-300 mb-3">Cor: <span className="font-normal">{selectedColor || 'Selecione uma cor'}</span></h3>
                <div className="flex flex-wrap gap-2">
                    {uniqueColors.map(colorInfo => (
                         <div key={colorInfo.name}
                            onClick={() => handleColorChange(colorInfo.name)}
                            className={`p-1 border-2 bg-white rounded-md cursor-pointer transition-all ${selectedColor === colorInfo.name ? 'border-amber-400 scale-105 shadow-lg' : 'border-transparent hover:border-gray-400'}`}
                            title={colorInfo.name}
                        >
                             <img src={colorInfo.image} alt={colorInfo.name} className="w-16 h-16 object-contain"/>
                         </div>
                    ))}
                </div>
            </div>
            {selectedColor && (
                 <div>
                    <h3 className="text-lg font-semibold text-gray-300 mb-3">Tamanho:</h3>
                    <div className="flex flex-wrap gap-3">
                        {allSizesForColor.length > 0 ? (
                            allSizesForColor.map(({ size, stock }) => (
                                <div key={size} className="relative">
                                    <button
                                        key={size}
                                        onClick={() => setSelectedSize(size)}
                                        disabled={stock === 0}
                                        className={`px-5 py-2 border-2 rounded-md font-bold transition-colors duration-200 
                                            ${selectedSize === size ? 'bg-amber-400 text-black border-amber-400' : 'border-gray-600 hover:bg-gray-800 hover:border-gray-500'}
                                            ${stock === 0 ? 'opacity-40 bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed' : ''}`
                                        }
                                    >
                                        {size}
                                    </button>
                                    {stock === 0 && (
                                        <div className="absolute -top-2 -right-2 bg-gray-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold border-2 border-black">
                                            X
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                             <p className="text-gray-500">Nenhum tamanho disponível para esta cor.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const ProductDetailPage = ({ productId, onNavigate }) => {
    const { user } = useAuth();
    const { addToCart } = useShop();
    const notification = useNotification();
    const confirmation = useConfirmation();
    const [isLoading, setIsLoading] = useState(true);
    const [product, setProduct] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [crossSellProducts, setCrossSellProducts] = useState([]);
    const [mainImage, setMainImage] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState('description');
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
    const [installments, setInstallments] = useState([]);
    const [isLoadingInstallments, setIsLoadingInstallments] = useState(true);
    const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
    const [selectedVariation, setSelectedVariation] = useState(null);
    const [galleryImages, setGalleryImages] = useState([]);
    
    const [timeLeft, setTimeLeft] = useState('');
    
    // Novo estado para controlar se a promoção está ativa visualmente
    // Inicializa com o valor real do produto
    const [isPromoActive, setIsPromoActive] = useState(false);

    const galleryRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const productImages = useMemo(() => parseJsonString(product?.images, []), [product]);
    const productVariations = useMemo(() => parseJsonString(product?.variations, []), [product]);

    // Atualiza o estado da promoção quando o produto é carregado
    useEffect(() => {
        if (product) {
            setIsPromoActive(!!product.is_on_sale && product.sale_price > 0);
        }
    }, [product]);

    // Usa o estado local isPromoActive para definir preço e desconto
    const currentPrice = isPromoActive ? product.sale_price : product?.price;

    const discountPercent = useMemo(() => {
        if (isPromoActive && product) {
            return Math.round(((product.price - product.sale_price) / product.price) * 100);
        }
        return 0;
    }, [isPromoActive, product]);

    // --- Lógica do Contador Regressivo e Expiração Automática ---
    useEffect(() => {
        // Se não houver data fim, mas estiver em promoção, mantém como promoção normal
        if (!product?.sale_end_date) {
            setTimeLeft(null);
            return;
        }
        
        // Se a promoção já foi desativada localmente, para
        if (!isPromoActive) return;

        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const endDate = new Date(product.sale_end_date).getTime();
            const difference = endDate - now;
            
            if (difference > 0) {
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((difference % (1000 * 60)) / 1000);

                setTimeLeft({ days, hours, minutes, seconds });
            } else {
                // TEMPO ACABOU: Desativa a promoção localmente na hora!
                setTimeLeft('Expirada');
                setIsPromoActive(false); // <--- ISSO REVERTE O PREÇO AUTOMATICAMENTE
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [isPromoActive, product?.sale_end_date]);

    const isNew = useMemo(() => {
        if (!product || !product.created_at) return false;
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return new Date(product.created_at) > thirtyDaysAgo;
    }, [product]);


    const avgRating = useMemo(() => {
        return reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length || 0;
    }, [reviews]);

    const itemsForShipping = useMemo(() => {
        if (!product) return [];
        return [{...product, qty: quantity}];
    }, [product, quantity]);

    const isClothing = product?.product_type === 'clothing';
    const isPerfume = product?.product_type === 'perfume';
    const isProductOutOfStock = product?.stock <= 0;
    const stockLimit = isClothing ? selectedVariation?.stock : product?.stock;
    const isQtyAtMax = stockLimit !== undefined ? quantity >= stockLimit : false;

    const getYouTubeEmbedUrl = (url) => {
        if (!url) return null;
        let videoId;
        try {
            const urlObj = new URL(url);
            if (urlObj.hostname === 'youtu.be') {
                videoId = urlObj.pathname.slice(1);
            } else if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
                videoId = urlObj.searchParams.get('v');
            } else { return null; }
            return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
        } catch (e) {
            console.error("URL do YouTube inválida:", e);
            return null;
        }
    };

    const parseTextToList = (text) => {
        if (!text || text.trim() === '') return null;
        return <ul className="space-y-1">{text.split('\n').map((line, index) => <li key={index} className="flex items-start"><span className="text-amber-400 mr-2 mt-1 text-xs">&#10003;</span><span>{line}</span></li>)}</ul>;
    };

    const getInstallmentSummary = () => {
        if (isLoadingInstallments) { return <div className="h-4 bg-gray-700 rounded w-3/4 animate-pulse"></div>; }
        if (!installments || installments.length === 0) { return <span className="text-gray-500 text-xs">Parcelamento indisponível.</span>; }
        const noInterest = [...installments].reverse().find(p => p.installment_rate === 0);
        if (noInterest) { return <span className="text-xs">em até <span className="font-bold">{noInterest.installments}x de R$&nbsp;{noInterest.installment_amount.toFixed(2).replace('.', ',')}</span> sem juros</span>; }
        const lastInstallment = installments[installments.length - 1];
        if (lastInstallment) { return <span className="text-xs">ou em até <span className="font-bold">{lastInstallment.installments}x de R$&nbsp;{lastInstallment.installment_amount.toFixed(2).replace('.', ',')}</span></span>; }
        return null;
    };

    const fetchProductData = useCallback(async (id) => {
        const controller = new AbortController();
        const signal = controller.signal;
        setIsLoading(true);
        try {
            const [productData, reviewsData, allProductsData, crossSellData] = await Promise.all([
                apiService(`/products/${id}`, 'GET', null, { signal }),
                apiService(`/products/${id}/reviews`, 'GET', null, { signal }),
                apiService('/products', 'GET', null, { signal }),
                apiService(`/products/${id}/related-by-purchase`, 'GET', null, { signal }).catch(() => [])
            ]);

            if (signal.aborted) return;

            const images = parseJsonString(productData.images, ['https://placehold.co/600x400/222/fff?text=Produto']);
            setMainImage(images[0] || 'https://placehold.co/600x400/222/fff?text=Produto');
            setGalleryImages(images);
            setProduct(productData);
            setReviews(Array.isArray(reviewsData) ? reviewsData : []);
            setCrossSellProducts(Array.isArray(crossSellData) ? crossSellData : []);

            if (productData && allProductsData) {
                const related = allProductsData.filter(p => p.id !== productData.id && (p.brand === productData.brand || p.category === productData.category)).slice(0, 8);
                setRelatedProducts(related);
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                 console.error("Falha ao buscar dados do produto:", err);
                 setProduct({ error: true, message: "Produto não encontrado ou ocorreu um erro." });
                 notification.show(err.message || "Produto não encontrado", 'error');
            }
        } finally {
            if (!signal.aborted) { setIsLoading(false); }
        }
        return () => { controller.abort(); };
    }, [notification]);

    const handleDeleteReview = (reviewId) => {
        confirmation.show("Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita.", async () => {
            try {
                await apiService(`/reviews/${reviewId}`, 'DELETE');
                notification.show('Avaliação excluída com sucesso.');
                fetchProductData(productId);
            } catch (error) {
                notification.show(`Erro ao excluir avaliação: ${error.message}`, 'error');
            }
        });
    };

    const handleShare = async () => {
        const shareText = `✨ Olha o que eu encontrei na Love Cestas e Perfumes!\n\n*${product.name}*\n\nConfira mais detalhes no site 👇`;
        const shareData = { title: `Love Cestas e Perfumes - ${product.name}`, text: shareText, url: window.location.href };
        if (navigator.share) {
            try { await navigator.share(shareData); } catch (err) { if (err.name !== 'AbortError') { notification.show('Compartilhamento cancelado.', 'error'); } }
        } else {
            try { await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`); notification.show('Link do produto copiado!'); } catch (err) { notification.show('Não foi possível copiar o link.', 'error'); }
        }
    };

    const handleQuantityChange = (amount) => {
        setQuantity(prev => {
            const newQty = prev + amount;
            if (newQty < 1) return 1;
            const currentStockLimit = isClothing ? selectedVariation?.stock : product?.stock;
            if (currentStockLimit !== undefined && newQty > currentStockLimit) {
                 notification.show(`Apenas ${currentStockLimit} unidades disponíveis.`, 'error');
                 return currentStockLimit;
            }
            return newQty;
        });
    };


    const handleAction = async (action) => {
        if (!product) return;
        if (isClothing && !selectedVariation) { notification.show("Por favor, selecione uma cor e um tamanho.", "error"); return; }
        try {
            await addToCart(product, quantity, selectedVariation);
            notification.show(`${quantity}x ${product.name} adicionado(s) ao carrinho!`);
            if (action === 'buyNow') { onNavigate('cart'); }
        } catch (error) { notification.show(error.message, 'error'); }
    };

    const handleVariationSelection = useCallback((variation, color) => {
        setQuantity(1);
        setSelectedVariation(variation);
        if (color && productVariations.length > 0) {
            const allImagesForColor = productVariations
                .filter(v => v.color === color && v.images && v.images.length > 0)
                .flatMap(v => v.images)
                .filter((value, index, self) => self.indexOf(value) === index);

            if (allImagesForColor.length > 0) {
                setGalleryImages(allImagesForColor);
                setMainImage(allImagesForColor[0]);
                return;
            }
        }
        setGalleryImages(productImages);
        setMainImage(productImages[0] || 'https://placehold.co/600x400/222/fff?text=Produto');

    }, [productVariations, productImages]);

    useEffect(() => {
        fetchProductData(productId);
        window.scrollTo(0, 0);
    }, [productId, fetchProductData]);

    useEffect(() => {
        const fetchInstallments = async (price) => {
            if (!price || price <= 0) {
                setInstallments([]);
                setIsLoadingInstallments(false);
                return;
            }
            setIsLoadingInstallments(true);
            setInstallments([]);
            try {
                const installmentData = await apiService(`/mercadopago/installments?amount=${price}`);
                setInstallments(installmentData || []);
            } catch (error) {
                console.warn("Não foi possível carregar as opções de parcelamento.", error);
                setInstallments([]);
            } finally {
                setIsLoadingInstallments(false);
            }
        };
        if (product && !product.error && currentPrice > 0) {
            fetchInstallments(currentPrice);
        } else if (!product || product.error || !(currentPrice > 0)) {
             setInstallments([]);
             setIsLoadingInstallments(false);
        }
    }, [product, currentPrice]);

    // Efeito e Funções para Galeria
    const checkScrollButtons = useCallback(() => {
        const gallery = galleryRef.current;
        if (gallery) {
            setCanScrollLeft(gallery.scrollLeft > 0);
            setCanScrollRight(gallery.scrollWidth > gallery.clientWidth + gallery.scrollLeft + 1);
        }
    }, []);

    useEffect(() => {
        checkScrollButtons();
        const gallery = galleryRef.current;
        if (gallery) {
            gallery.addEventListener('scroll', checkScrollButtons);
            window.addEventListener('resize', checkScrollButtons);
            return () => {
                gallery.removeEventListener('scroll', checkScrollButtons);
                window.removeEventListener('resize', checkScrollButtons);
            };
        }
    }, [galleryImages, checkScrollButtons]);

    const scrollGallery = (direction) => {
        const gallery = galleryRef.current;
        if (gallery) {
            const scrollAmount = gallery.clientWidth * 0.7;
            gallery.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const TabButton = ({ label, tabName, isVisible = true }) => {
        if (!isVisible) return null;
        return (
            <button onClick={() => setActiveTab(tabName)} className={`px-5 py-3 text-sm font-semibold transition-colors duration-200 border-b-2 ${activeTab === tabName ? 'border-amber-400 text-white' : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600'}`} > {label} </button>
        );
    };

    const Lightbox = ({ mainImage, onClose }) => (
        <div className="fixed inset-0 bg-black/90 z-[999] flex items-center justify-center p-4" onClick={onClose}>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-4 right-4 text-white text-5xl leading-none z-[1000] p-2">&times;</button>
            <div className="relative w-full h-full max-w-5xl max-h-[90vh] flex items-center justify-center" onClick={e => e.stopPropagation()}><img src={mainImage} alt="Imagem ampliada" className="max-w-full max-h-full object-contain rounded-lg" /></div>
        </div>
    );

    if (isLoading) return <div className="text-white text-center py-20 bg-black min-h-screen">Carregando...</div>;
    if (product?.error) return <div className="text-white text-center py-20 bg-black min-h-screen">{product.message}</div>;
    if (!product) return <div className="bg-black min-h-screen"></div>;

    const currentStockStatus = isClothing ? selectedVariation?.stock : product?.stock;
    const productOrVariationOutOfStock = currentStockStatus <= 0;

    const showGalleryArrows = galleryImages.length + (product.video_url ? 1 : 0) > 4;

    return (
        <div className="bg-black text-white min-h-screen">
            <InstallmentModal isOpen={isInstallmentModalOpen} onClose={() => setIsInstallmentModalOpen(false)} installments={installments}/>
            {isLightboxOpen && galleryImages.length > 0 && ( <Lightbox mainImage={mainImage} onClose={() => setIsLightboxOpen(false)} /> )}
            <AnimatePresence>
                {isVideoModalOpen && product.video_url && (
                     <Modal isOpen={true} onClose={() => setIsVideoModalOpen(false)} title="Vídeo do Produto" size="2xl">
                        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, backgroundColor: 'black' }}>
                            <iframe src={getYouTubeEmbedUrl(product.video_url)} title={product.name} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}></iframe>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            <div className="container mx-auto px-4 py-8 lg:py-12">
                <div className="mb-6">
                    <button onClick={() => onNavigate('products')} className="text-sm text-amber-400 hover:underline flex items-center w-fit transition-colors"> <ArrowUturnLeftIcon className="h-4 w-4 mr-1.5"/> Voltar para todos os produtos </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
                    <div className="lg:sticky lg:top-24 self-start">
                        <div onClick={() => galleryImages.length > 0 && setIsLightboxOpen(true)} className={`aspect-square bg-white rounded-lg flex items-center justify-center relative mb-4 shadow-lg overflow-hidden group ${galleryImages.length > 0 ? 'cursor-zoom-in' : ''}`}>
                             {!productOrVariationOutOfStock && ( <div className="absolute top-3 left-3 flex flex-col gap-2 z-10"> {isPromoActive ? ( <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5"> <SaleIcon className="h-4 w-4"/> <span>PROMOÇÃO {discountPercent}%</span> </div> ) : isNew ? ( <div className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">LANÇAMENTO</div> ) : null} </div> )}
                             {productOrVariationOutOfStock && ( <div className="absolute top-3 left-3 bg-gray-700 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg z-10">ESGOTADO</div> )}
                            <img src={mainImage} alt={product.name} className="w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-105" />
                        </div>

                        {/* Galeria com Setas */}
                        <div className="relative group">
                            <div
                                ref={galleryRef}
                                className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
                                style={{
                                    msOverflowStyle: 'none', 
                                    scrollbarWidth: 'none' 
                                }}
                            >
                                <style>{` .scrollbar-hide::-webkit-scrollbar { display: none; } `}</style>

                               {product.video_url && (
                                    <div onClick={() => setIsVideoModalOpen(true)} className="w-20 h-20 flex-shrink-0 bg-black p-1 rounded-md cursor-pointer border-2 border-transparent hover:border-amber-400 relative flex items-center justify-center transition-colors">
                                        <img src={galleryImages[0] || getFirstImage(product.images)} alt="Vídeo do produto" className="w-full h-full object-contain filter blur-sm opacity-50"/>
                                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                                            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>
                                        </div>
                                    </div>
                                )}
                                {galleryImages.map((img, index) => (
                                    <div
                                        key={index}
                                        onClick={() => setMainImage(img)}
                                        onMouseEnter={() => setMainImage(img)}
                                        className={`w-20 h-20 flex-shrink-0 bg-white p-1 rounded-md cursor-pointer border-2 transition-all duration-150 ${mainImage === img ? 'border-amber-400' : 'border-transparent hover:border-gray-400'}`}
                                    >
                                        <img src={img} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-contain" />
                                    </div>
                                ))}
                            </div>
                            {showGalleryArrows && (
                                <>
                                    <button onClick={() => scrollGallery('left')} disabled={!canScrollLeft} className={`absolute top-1/2 left-0 transform -translate-y-1/2 -ml-3 z-10 p-2 bg-gray-800/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-gray-700 disabled:opacity-0 disabled:cursor-default`} aria-label="Scroll Left">
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                     <button onClick={() => scrollGallery('right')} disabled={!canScrollRight} className={`absolute top-1/2 right-0 transform -translate-y-1/2 -mr-3 z-10 p-2 bg-gray-800/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-gray-700 disabled:opacity-0 disabled:cursor-default`} aria-label="Scroll Right">
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <p className="text-sm text-amber-400 font-semibold tracking-wider mb-1">{product.brand.toUpperCase()}</p>
                            <h1 className="text-2xl lg:text-3xl font-bold mb-1.5">{product.name}</h1>
                            {isPerfume && product.volume && <h2 className="text-base font-light text-gray-400">{String(product.volume).toLowerCase().includes('ml') ? product.volume : `${product.volume}ml`}</h2>}
                            <div className="flex items-center mt-2 justify-between">
                                <div className="flex items-center gap-1.5">
                                    <div className="flex items-center gap-0.5">{[...Array(5)].map((_, i) => <StarIcon key={i} className={`h-4 w-4 ${i < Math.round(avgRating) ? 'text-amber-400' : 'text-gray-600'}`} isFilled={i < Math.round(avgRating)} />)}</div>
                                    {reviews.length > 0 && <span className="text-xs text-gray-500">({reviews.length} avaliações)</span>}
                                    {reviews.length === 0 && <span className="text-xs text-gray-500">Seja o primeiro a avaliar</span>}
                                </div>
                                <button onClick={handleShare} className="flex items-center gap-1.5 text-gray-400 hover:text-amber-400 transition-colors p-1 rounded-md text-sm"> <ShareIcon className="h-4 w-4"/> <span className="hidden sm:inline">Compartilhar</span> </button>
                            </div>
                        </div>

                        {/* --- ÁREA DE PROMOÇÃO AVANÇADA (MOBILE AJUSTADO) --- */}
                        {isPromoActive && timeLeft && timeLeft !== 'Expirada' && (
                            <div className="bg-gradient-to-br from-red-900/40 to-black border border-red-800 rounded-lg p-4 mb-4 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                                    <ClockIcon className="h-24 w-24 text-red-500" />
                                </div>
                                <div className="flex items-center justify-center sm:justify-start gap-2 mb-3 text-red-400 font-bold uppercase tracking-wide text-xs sm:text-sm">
                                    <SparklesIcon className="h-4 w-4 animate-pulse" />
                                    Oferta por Tempo Limitado
                                </div>
                                
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10 w-full">
                                    {/* Contador - Centralizado e Responsivo */}
                                    <div className="text-white font-mono text-lg sm:text-2xl font-bold flex justify-center gap-2 w-full sm:w-auto">
                                        <div className="bg-black/50 px-2 py-1 rounded border border-red-900/50 flex flex-col items-center min-w-[45px] sm:min-w-[50px]">
                                            <span>{String(timeLeft.days).padStart(2, '0')}</span>
                                            <span className="text-[9px] sm:text-[10px] font-sans font-normal text-gray-400">DIAS</span>
                                        </div>
                                        <span className="self-center text-red-500">:</span>
                                        <div className="bg-black/50 px-2 py-1 rounded border border-red-900/50 flex flex-col items-center min-w-[45px] sm:min-w-[50px]">
                                            <span>{String(timeLeft.hours).padStart(2, '0')}</span>
                                            <span className="text-[9px] sm:text-[10px] font-sans font-normal text-gray-400">HORAS</span>
                                        </div>
                                        <span className="self-center text-red-500">:</span>
                                        <div className="bg-black/50 px-2 py-1 rounded border border-red-900/50 flex flex-col items-center min-w-[45px] sm:min-w-[50px]">
                                            <span>{String(timeLeft.minutes).padStart(2, '0')}</span>
                                            <span className="text-[9px] sm:text-[10px] font-sans font-normal text-gray-400">MIN</span>
                                        </div>
                                        <span className="self-center text-red-500">:</span>
                                        <div className="bg-black/50 px-2 py-1 rounded border border-red-900/50 flex flex-col items-center min-w-[45px] sm:min-w-[50px]">
                                            <span>{String(timeLeft.seconds).padStart(2, '0')}</span>
                                            <span className="text-[9px] sm:text-[10px] font-sans font-normal text-gray-400">SEG</span>
                                        </div>
                                    </div>

                                    {/* Preços - Empilhados e centralizados no mobile */}
                                    <div className="flex flex-col items-center sm:items-end w-full sm:w-auto border-t sm:border-t-0 border-red-900/30 pt-3 sm:pt-0 mt-1 sm:mt-0">
                                        <p className="text-gray-400 text-sm">De: <span className="line-through">R$ {Number(product.price).toFixed(2).replace('.', ',')}</span></p>
                                        <div className="flex items-center justify-center sm:justify-end gap-2">
                                            <p className="text-white font-bold text-xl">Por: <span className="text-amber-400">R$ {Number(product.sale_price).toFixed(2).replace('.', ',')}</span></p>
                                        </div>
                                        <p className="text-xs text-green-400 font-semibold mt-1 bg-green-900/20 px-3 py-0.5 rounded-full inline-block">Economize {discountPercent}%</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- ÁREA DE PROMOÇÃO PADRÃO (SEM TEMPO LIMITADO) --- */}
                        {isPromoActive && (!timeLeft || timeLeft === 'Expirada') && (
                             <div className="bg-gradient-to-br from-green-900/40 to-black border border-green-800 rounded-lg p-4 mb-4 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                                    <TagIcon className="h-24 w-24 text-green-500" />
                                </div>
                                <div className="flex items-center gap-2 mb-2 text-green-400 font-bold uppercase tracking-wide text-sm">
                                    <SaleIcon className="h-5 w-5" />
                                    Preço Especial
                                </div>
                                <div className="flex items-center justify-between relative z-10">
                                    <div>
                                        <p className="text-gray-400 text-sm">De: <span className="line-through">R$ {Number(product.price).toFixed(2).replace('.', ',')}</span></p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-white font-bold text-2xl">Por: <span className="text-green-400">R$ {Number(product.sale_price).toFixed(2).replace('.', ',')}</span></p>
                                        </div>
                                    </div>
                                    <div className="bg-green-600 text-white font-bold px-3 py-1 rounded-full text-sm shadow-lg">
                                        -{discountPercent}%
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="border-t border-b border-gray-800 py-4">
                            {isPromoActive ? (
                                <div className="flex items-center gap-3">
                                    <p className="text-4xl font-bold text-red-500">R$ {Number(product.sale_price).toFixed(2).replace('.',',')}</p>
                                    {!timeLeft && <span className="text-sm font-bold text-green-500 bg-green-900/50 px-2 py-0.5 rounded-md">{discountPercent}% OFF</span>}
                                </div>
                             ) : ( <p className="text-3xl font-bold text-white">R$ {Number(product.price).toFixed(2).replace('.',',')}</p> )}
                            <div className="mt-2 flex items-center gap-2 text-sm text-gray-300">
                                <CreditCardIcon className="h-5 w-5 text-amber-400 flex-shrink-0" />
                                <span>{getInstallmentSummary()}</span>
                                {!isLoadingInstallments && installments && installments.length > 0 && ( <button onClick={() => setIsInstallmentModalOpen(true)} className="text-amber-400 font-semibold hover:underline text-xs ml-2"> (ver mais)</button> )}
                            </div>
                        </div>

                        {isClothing && ( <VariationSelector product={product} variations={productVariations} onSelectionChange={handleVariationSelection} /> )}

                        {!productOrVariationOutOfStock && (
                            <div className="flex items-center space-x-4">
                                <p className="font-semibold text-sm">Quantidade:</p>
                                <div className="flex items-center border border-gray-700 rounded-md overflow-hidden">
                                    <button onClick={() => handleQuantityChange(-1)} className="px-3 py-1.5 text-lg hover:bg-gray-800 transition-colors">-</button>
                                    <span className="px-4 py-1.5 font-bold text-base border-x border-gray-700">{quantity}</span>
                                    <button onClick={() => handleQuantityChange(1)} disabled={isQtyAtMax} className="px-3 py-1.5 text-lg hover:bg-gray-800 transition-colors disabled:text-gray-600 disabled:cursor-not-allowed disabled:hover:bg-transparent">+</button>
                                </div>
                                {stockLimit !== undefined && <span className="text-xs text-gray-500">({stockLimit} unid. disponíveis)</span>}
                                {isQtyAtMax && <span className="text-xs text-red-400">Limite atingido</span>}
                            </div>
                        )}

                        <div className="space-y-3 pt-2">
                            {productOrVariationOutOfStock ? ( <div className="w-full bg-gray-700 text-gray-400 py-3 rounded-md text-base text-center font-bold"> {isClothing && selectedVariation ? 'Variação Esgotada' : 'Produto Esgotado'} </div> ) : ( <> <button onClick={() => handleAction('buyNow')} className="w-full bg-amber-400 text-black py-3.5 rounded-md text-base hover:bg-amber-300 transition font-bold disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg" disabled={isClothing && !selectedVariation} > Comprar Agora </button> <button onClick={() => handleAction('addToCart')} className="w-full bg-gray-800 border border-gray-700 text-white py-3 rounded-md text-base hover:bg-gray-700 transition font-bold disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow hover:shadow-md" disabled={isClothing && !selectedVariation} > <CartIcon className="h-5 w-5" /> Adicionar ao Carrinho </button> </> )}
                        </div>

                        <ShippingCalculator items={itemsForShipping} />
                    </div>
                </div>

                <div className="mt-16 lg:mt-24 pt-10 border-t border-gray-800">
                    <div className="flex justify-center border-b border-gray-800 mb-8 flex-wrap -mt-3">
                        <TabButton label="Descrição" tabName="description" />
                        <TabButton label="Notas Olfativas" tabName="notes" isVisible={isPerfume} />
                        <TabButton label="Como Usar" tabName="how_to_use" isVisible={isPerfume} />
                        <TabButton label="Ideal Para" tabName="ideal_for" isVisible={isPerfume} />
                        <TabButton label="Guia de Medidas" tabName="size_guide" isVisible={isClothing} />
                        <TabButton label="Cuidados com a Peça" tabName="care" isVisible={isClothing} />
                    </div>
                    <div className="text-gray-300 leading-relaxed max-w-3xl mx-auto min-h-[100px] prose prose-invert prose-sm sm:prose-base prose-li:my-1 prose-p:my-2">
                        {activeTab === 'description' && <p>{product.description || 'Descrição não disponível.'}</p>}
                        {isPerfume && activeTab === 'notes' && (product.notes ? parseTextToList(product.notes) : <p>Notas olfativas não disponíveis.</p>)}
                        {isPerfume && activeTab === 'how_to_use' && <p>{product.how_to_use || 'Instruções de uso não disponíveis.'}</p>}
                        {isPerfume && activeTab === 'ideal_for' && (product.ideal_for ? parseTextToList(product.ideal_for) : <p>Informação não disponível.</p>)}
                        {isClothing && activeTab === 'size_guide' && (product.size_guide ? <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: product.size_guide }}/> : <p>Guia de medidas não disponível.</p>)}
                        {isClothing && activeTab === 'care' && (product.care_instructions ? parseTextToList(product.care_instructions) : <p>Instruções de cuidado não disponíveis.</p>)}
                    </div>
                </div>

                {crossSellProducts.length > 0 && ( <div className="mt-16 pt-10 border-t border-gray-800"><ProductCarousel products={crossSellProducts} onNavigate={onNavigate} title="Quem comprou, levou também" /></div> )}
                {relatedProducts.length > 0 && ( <div className="mt-16 pt-10 border-t border-gray-800"><ProductCarousel products={relatedProducts} onNavigate={onNavigate} title="Pode também gostar de..." /></div> )}

                <div className="mt-16 pt-10 border-t border-gray-800 max-w-3xl mx-auto">
                    <h2 className="text-2xl font-bold mb-8 text-center">Avaliações de Clientes</h2>
                    <div className="space-y-8 mb-10">
                      {reviews.length > 0 ? reviews.map((review) => (
                            <div key={review.id} className="border-b border-gray-800 pb-6 last:border-b-0 last:pb-0 relative group">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 flex-shrink-0">
                                        <UserIcon className="h-5 w-5" />
                                    </div>
                                    <span className="font-semibold text-white text-sm">{review.user_name || 'Cliente'}</span>
                                     {user && user.role === 'admin' && (
                                        <button
                                            onClick={() => handleDeleteReview(review.id)}
                                            className="absolute top-0 right-0 p-1 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Excluir avaliação"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="flex">{[...Array(5)].map((_, j) => <StarIcon key={j} className={`h-5 w-5 ${j < review.rating ? 'text-amber-400' : 'text-gray-600'}`} isFilled={j < review.rating}/>)}</div>
                                    {review.comment && review.comment.length > 30 && <span className="font-bold text-white text-sm ml-2 truncate">{review.comment.substring(0, 30)}...</span>}
                                </div>
                                <p className="text-xs text-gray-500 mb-2">
                                    Avaliado no Brasil em {new Date(review.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                                <p className="text-xs font-semibold text-amber-500 mb-3">Compra verificada</p>
                                {review.comment && <p className="text-gray-300 text-sm leading-relaxed break-words">{review.comment}</p>}
                            </div>
                        )) : <p className="text-gray-500 text-center mb-8">Este produto ainda não possui avaliações.</p>}
                    </div>

                    <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-center shadow">
                        <h3 className="font-semibold text-white mb-2">Comprou este produto?</h3>
                        <p className="text-gray-400 text-sm mb-4">Compartilhe sua opinião para ajudar outros clientes!</p>
                        <p className="text-xs text-gray-500">Você pode avaliar os produtos comprados na seção <a href="#account/orders" onClick={(e) => {e.preventDefault(); onNavigate('account/orders')}} className="text-amber-400 underline hover:text-amber-300">Meus Pedidos</a>.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LoginPage = ({ onNavigate }) => {
    const { login, setUser } = useAuth();
    const notification = useNotification();

    // Estados do formulário
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    // Estados para o fluxo 2FA
    const [isTwoFactorStep, setIsTwoFactorStep] = useState(false);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [tempAuthToken, setTempAuthToken] = useState('');

    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

   const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            // Usa a função centralizada do AuthContext
            const response = await login(email, password);

            if (response.twoFactorEnabled) {
                // Se 2FA for necessário, muda para a próxima etapa
                setTempAuthToken(response.token);
                setIsTwoFactorStep(true);
            } else {
                // Login normal bem-sucedido
                notification.show('Login bem-sucedido!');
                onNavigate('home'); // Usa a navegação controlada pelo App
            }
        } catch (err) {
            setError(err.message || "Ocorreu um erro desconhecido.");
            notification.show(err.message || "Ocorreu um erro desconhecido.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleTwoFactorSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const response = await apiService('/login/2fa/verify', 'POST', { token: twoFactorCode, tempAuthToken });
            const { user } = response;

            // Define manualmente o usuário no contexto e no localStorage
            setUser(user);
            localStorage.setItem('user', JSON.stringify(user));

            notification.show('Login bem-sucedido!');
            onNavigate('home'); // Usa a navegação controlada pelo App

        } catch (err) {
            setError(err.message || "Código 2FA inválido ou expirado.");
            notification.show(err.message || "Código 2FA inválido.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        // --- MODIFICAÇÃO: Estilo do container principal e padding ---
        <div className="min-h-screen flex items-center justify-center bg-black p-4 sm:p-6"> {/* Fundo preto sólido, padding ajustado */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                // --- MODIFICAÇÃO: Estilo do card de login, cores e responsividade ---
                className="w-full max-w-sm sm:max-w-md bg-gray-900 text-white p-6 sm:p-8 rounded-lg shadow-lg border border-gray-800" // Fundo mais escuro, padding ajustado, tamanho máximo ajustado para mobile
            >
                {error && <p className="text-red-400 text-center mb-4 bg-red-900/50 p-3 rounded-md text-sm">{error}</p>}

                <AnimatePresence mode="wait">
                    {!isTwoFactorStep ? (
                        <motion.div key="login-form" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
                            <div className="text-center mb-6">
                                {/* --- MODIFICAÇÃO: Tamanho da imagem e margem --- */}
                                <div className="mx-auto mb-3 inline-block w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center"> {/* Tamanho menor no mobile */}
                                  <img src="https://res.cloudinary.com/dvflxuxh3/image/upload/v1752292990/uqw1twmffseqafkiet0t.png" alt="Logo" className="w-full h-full object-contain" />
                                </div>
                                {/* --- MODIFICAÇÃO: Tamanho do título --- */}
                                <h2 className="text-2xl sm:text-3xl font-bold text-amber-400">Bem-vindo de Volta</h2>
                            </div>
                            <form onSubmit={handleLogin} className="space-y-5"> {/* Espaçamento ligeiramente menor */}
                                <div>
                                    <label className="text-xs sm:text-sm font-medium text-gray-400 mb-1 block">Email</label>
                                    {/* --- MODIFICAÇÃO: Padding e tamanho de texto dos inputs --- */}
                                    <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 text-sm sm:text-base" />
                                </div>
                                <div>
                                    <label className="text-xs sm:text-sm font-medium text-gray-400 mb-1 block">Senha</label>
                                    <div className="relative">
                                        <input type={isPasswordVisible ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 pr-10 text-sm sm:text-base" />
                                       <button type="button" onClick={() => setIsPasswordVisible(v => !v)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-amber-400">
                                            {isPasswordVisible ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                                        </button>
                                    </div>
                                </div>
                                {/* --- MODIFICAÇÃO: Padding e tamanho de texto do botão --- */}
                                <button type="submit" disabled={isLoading} className="w-full py-2.5 sm:py-3 px-4 bg-amber-400 text-black font-bold rounded-md hover:bg-amber-300 transition flex justify-center items-center disabled:opacity-60 text-base sm:text-lg">
                                     {isLoading ? <SpinnerIcon /> : 'Entrar'}
                                </button>
                            </form>
                             {/* --- MODIFICAÇÃO: Tamanho de texto dos links --- */}
                             <div className="text-center mt-5 text-xs sm:text-sm">
                                <p className="text-gray-400">Não tem uma conta?{' '}<a href="#register" onClick={(e) => {e.preventDefault(); onNavigate('register')}} className="font-semibold text-amber-400 hover:underline">Registre-se</a></p>
                                <a href="#forgot-password" onClick={(e) => {e.preventDefault(); onNavigate('forgot-password')}} className="text-gray-500 hover:underline mt-2 inline-block">Esqueceu sua senha?</a>
                            </div>
                        </motion.div>
                    ) : ( // Formulário 2FA (estilos mantidos, pois já eram adequados)
                        <motion.div key="2fa-form" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                            <div className="text-center mb-6">
                                <div className="mx-auto mb-4 inline-block rounded-full bg-gray-800 p-4 border border-gray-700"><CheckBadgeIcon className="h-8 w-8 text-amber-400" /></div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-amber-400">Verificação de Dois Fatores</h2>
                                <p className="text-gray-400 mt-2 text-sm sm:text-base">Insira o código do seu aplicativo autenticador.</p>
                            </div>
                            <form onSubmit={handleTwoFactorSubmit} className="space-y-6">
                                <div>
                                    <label className="text-xs sm:text-sm font-medium text-gray-400 mb-1 block">Código de 6 dígitos</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="\d{6}"
                                        maxLength="6"
                                        placeholder="123456"
                                        value={twoFactorCode}
                                        onChange={e => setTwoFactorCode(e.target.value)}
                                        required
                                        className="w-full text-center tracking-[0.5em] sm:tracking-[1em] px-4 py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 text-xl sm:text-2xl font-mono" /> {/* Ajuste no tracking para mobile */}
                                </div>
                                <button type="submit" disabled={isLoading} className="w-full py-2.5 sm:py-3 px-4 bg-amber-400 text-black font-bold rounded-md hover:bg-amber-300 transition flex justify-center items-center disabled:opacity-60 text-base sm:text-lg">
                                     {isLoading ? <SpinnerIcon /> : 'Verificar'}
                                </button>
                            </form>
                             <div className="text-center mt-6 text-xs sm:text-sm">
                                <button onClick={() => { setIsTwoFactorStep(false); setError(''); }} className="text-gray-500 hover:underline">Voltar</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

const RegisterPage = ({ onNavigate }) => {
    const { register } = useAuth();
    const notification = useNotification();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [cpf, setCpf] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        if (password.length < 6) {
             setError("A senha deve ter pelo menos 6 caracteres.");
             return;
        }
        if (!validateCPF(cpf)) {
            setError("O CPF informado é inválido.");
            return;
        }

        setIsLoading(true);
        try {
            await register(name, email, password, cpf);
            notification.show("Usuário registrado com sucesso! Você já pode fazer o login.");
            setTimeout(() => onNavigate('login'), 2000);
        } catch (err) {
            setError(err.message);
            notification.show(err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCpfChange = (e) => {
        setCpf(maskCPF(e.target.value));
    };

    return (
        // --- MODIFICAÇÃO: Estilo do container principal e padding ---
        <div className="min-h-screen flex items-center justify-center bg-black p-4 sm:p-6"> {/* Fundo preto sólido, padding ajustado */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                 // --- MODIFICAÇÃO: Estilo do card de registro, cores e responsividade ---
                className="w-full max-w-sm sm:max-w-md bg-gray-900 text-white p-6 sm:p-8 rounded-lg shadow-lg border border-gray-800" // Fundo mais escuro, padding ajustado, tamanho máximo ajustado para mobile
            >
                <motion.div variants={itemVariants} className="text-center mb-6">
                    {/* --- MODIFICAÇÃO: Tamanho do título --- */}
                    <h2 className="text-2xl sm:text-3xl font-bold text-amber-400">Crie Sua Conta</h2>
                    <p className="text-gray-400 mt-2 text-sm sm:text-base">É rápido e fácil.</p>
                </motion.div>

                {error && <p className="text-red-400 text-center mb-4 bg-red-900/50 p-3 rounded-md text-sm">{error}</p>}
                <motion.form variants={itemVariants} onSubmit={handleRegister} className="space-y-4"> {/* Reduzido space-y */}
                    {/* --- MODIFICAÇÃO: Padding e tamanho de texto dos inputs --- */}
                    <input type="text" placeholder="Nome Completo" value={name} onChange={e => setName(e.target.value)} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all text-sm sm:text-base" />
                    <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all text-sm sm:text-base" />
                    <input type="text" placeholder="CPF" value={cpf} onChange={handleCpfChange} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all text-sm sm:text-base" />
                    <div className="relative">
                        <input
                            type={isPasswordVisible ? 'text' : 'password'}
                            placeholder="Senha (mín. 6 caracteres)"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all pr-10 text-sm sm:text-base"
                        />
                        <button
                            type="button"
                            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                            className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-amber-400"
                        >
                            {isPasswordVisible ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                        </button>
                    </div>
                     {/* --- MODIFICAÇÃO: Padding e tamanho de texto do botão --- */}
                    <button type="submit" disabled={isLoading} className="w-full py-2.5 sm:py-3 px-4 bg-amber-400 text-black font-bold rounded-md hover:bg-amber-300 transition flex justify-center items-center disabled:opacity-60 text-base sm:text-lg">
                        {isLoading ? <SpinnerIcon /> : 'Registrar'}
                    </button>
                </motion.form>
                {/* --- MODIFICAÇÃO: Tamanho de texto do link --- */}
                 <motion.div variants={itemVariants} className="text-center mt-5 text-xs sm:text-sm">
                     <p className="text-gray-400">
                        Já tem uma conta?{' '}
                        <a href="#login" onClick={(e) => {e.preventDefault(); onNavigate('login')}} className="font-semibold text-amber-400 hover:underline">Faça o login</a>
                    </p>
                </motion.div>
            </motion.div>
        </div>
    );
};

const ForgotPasswordPage = ({ onNavigate }) => {
    const notification = useNotification();
    const [email, setEmail] = useState('');
    const [cpf, setCpf] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [step, setStep] = useState(1);
    const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    const handleValidation = async (e) => {
        e.preventDefault();
        setError('');
        if (!validateCPF(cpf)) {
            setError("O CPF informado é inválido.");
            return;
        }

        try {
            await apiService('/forgot-password', 'POST', { email, cpf });
            notification.show('Usuário validado com sucesso. Por favor, crie uma nova senha.');
            setStep(2);
        } catch (err) {
            setError(err.message || 'E-mail ou CPF não correspondem a um usuário cadastrado.');
            notification.show(err.message || 'Dados inválidos.', 'error');
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword.length < 6) {
            setError("A nova senha deve ter pelo menos 6 caracteres.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("As senhas não coincidem.");
            return;
        }
        try {
            await apiService('/reset-password', 'POST', { email, cpf, newPassword });
            notification.show('Senha redefinida com sucesso! Você já pode fazer login.');
            setTimeout(() => onNavigate('login'), 2000);
        } catch (err) {
            setError(err.message);
            notification.show(err.message, 'error');
        }
    };

    return (
         // --- MODIFICAÇÃO: Estilo do container principal e padding ---
        <div className="min-h-screen flex items-center justify-center bg-black p-4 sm:p-6"> {/* Fundo preto sólido, padding ajustado */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                // --- MODIFICAÇÃO: Estilo do card, cores e responsividade ---
                className="w-full max-w-sm sm:max-w-md bg-gray-900 text-white p-6 sm:p-8 rounded-lg shadow-lg border border-gray-800" // Fundo mais escuro, padding ajustado, tamanho máximo ajustado
            >
                <motion.div variants={itemVariants} className="text-center mb-6">
                     {/* --- MODIFICAÇÃO: Tamanho do título --- */}
                    <h2 className="text-2xl sm:text-3xl font-bold text-amber-400">Recuperar Senha</h2>
                </motion.div>

                {error && <p className="text-red-400 text-center mb-4 bg-red-900/50 p-3 rounded-md text-sm">{error}</p>}

                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.form
                            key="step1"
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            onSubmit={handleValidation} className="space-y-4"> {/* Reduzido space-y */}
                             {/* --- MODIFICAÇÃO: Tamanho de texto da descrição --- */}
                            <p className="text-xs sm:text-sm text-gray-400 text-center">Para começar, por favor, insira seu e-mail e CPF cadastrados.</p>
                            {/* --- MODIFICAÇÃO: Padding e tamanho de texto dos inputs --- */}
                            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 text-sm sm:text-base" />
                            <input type="text" placeholder="CPF" value={cpf} onChange={e => setCpf(maskCPF(e.target.value))} required className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 text-sm sm:text-base" />
                            {/* --- MODIFICAÇÃO: Padding e tamanho de texto do botão --- */}
                            <button type="submit" className="w-full py-2.5 sm:py-3 px-4 bg-amber-400 text-black font-bold rounded-md hover:bg-amber-300 transition text-base sm:text-lg">Verificar</button>
                        </motion.form>
                    ) : (
                        <motion.form
                            key="step2"
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            onSubmit={handlePasswordReset} className="space-y-4"> {/* Reduzido space-y */}
                            {/* --- MODIFICAÇÃO: Tamanho de texto da descrição --- */}
                            <p className="text-xs sm:text-sm text-gray-400 text-center">Usuário validado! Agora, crie sua nova senha.</p>
                            {/* --- MODIFICAÇÃO: Padding e tamanho de texto dos inputs de senha --- */}
                            <div className="relative">
                                <input
                                    type={isNewPasswordVisible ? 'text' : 'password'}
                                    placeholder="Nova Senha"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    required
                                    className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 pr-10 text-sm sm:text-base"
                                />
                                <button type="button" onClick={() => setIsNewPasswordVisible(!isNewPasswordVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-amber-400">
                                    {isNewPasswordVisible ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type={isConfirmPasswordVisible ? 'text' : 'password'}
                                    placeholder="Confirmar Nova Senha"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                    className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 pr-10 text-sm sm:text-base"
                                />
                                <button type="button" onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-amber-400">
                                    {isConfirmPasswordVisible ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                                </button>
                            </div>
                            {/* --- MODIFICAÇÃO: Padding e tamanho de texto do botão --- */}
                            <button type="submit" className="w-full py-2.5 sm:py-3 px-4 bg-amber-400 text-black font-bold rounded-md hover:bg-amber-300 transition text-base sm:text-lg">Redefinir Senha</button>
                        </motion.form>
                    )}
                </AnimatePresence>

                 {/* --- MODIFICAÇÃO: Tamanho de texto do link --- */}
                <motion.div variants={itemVariants} className="text-center mt-5 text-xs sm:text-sm">
                    <a href="#login" onClick={(e) => { e.preventDefault(); onNavigate('login'); }} className="text-gray-400 hover:underline">Voltar para o Login</a>
                </motion.div>
            </motion.div>
        </div>
    );
};

const CartPage = ({ onNavigate }) => {
    const {
        cart,
        updateQuantity,
        removeFromCart,
        autoCalculatedShipping,
        isLoadingShipping,
        shippingError,
        couponCode, setCouponCode,
        applyCoupon, removeCoupon,
        couponMessage, appliedCoupon
    } = useShop();
    const notification = useNotification();

    const subtotal = useMemo(() => cart.reduce((sum, item) => {
        const price = item.is_on_sale && item.sale_price ? item.sale_price : item.price;
        return sum + price * item.qty;
    }, 0), [cart]);

    const shippingCost = useMemo(() => autoCalculatedShipping ? autoCalculatedShipping.price : 0, [autoCalculatedShipping]);

    const discount = useMemo(() => {
        if (!appliedCoupon) return 0;
        let discountValue = 0;
        if (appliedCoupon.type === 'percentage') {
            discountValue = subtotal * (parseFloat(appliedCoupon.value) / 100);
        } else if (appliedCoupon.type === 'fixed') {
            discountValue = parseFloat(appliedCoupon.value);
        } else if (appliedCoupon.type === 'free_shipping') {
            discountValue = shippingCost;
        }
        // Garante que o desconto não seja maior que o subtotal + frete (exceto frete grátis)
        if (appliedCoupon.type !== 'free_shipping' && discountValue > subtotal + shippingCost) {
            return subtotal + shippingCost;
        }
        return discountValue;
    }, [appliedCoupon, subtotal, shippingCost]);


    const handleApplyCoupon = (e) => {
        e.preventDefault();
        if (couponCode.trim()) {
            applyCoupon(couponCode);
        }
    }

    const total = useMemo(() => {
        const calculatedTotal = subtotal - discount + shippingCost;
        return calculatedTotal < 0 ? 0 : calculatedTotal; // Evita total negativo
    }, [subtotal, discount, shippingCost]);


    const handleUpdateQuantity = async (cartItemId, newQuantity) => {
        try {
            await updateQuantity(cartItemId, newQuantity);
        } catch (error) {
            notification.show(error.message, 'error');
        }
    };

    return (
        <div className="bg-black text-white min-h-screen">
            <div className="container mx-auto px-4 py-12"> {/* Aumentado padding vertical */}
                <h1 className="text-3xl md:text-4xl font-bold mb-10 text-center">Meu Carrinho</h1> {/* Centralizado e margem aumentada */}
                {cart.length === 0 ? (
                    <EmptyState
                        icon={<CartIcon className="h-12 w-12"/>}
                        title="Seu carrinho está vazio"
                        message="Explore nossos produtos e adicione seus favoritos!"
                        buttonText="Ver Produtos"
                        onButtonClick={() => onNavigate('products')}
                    />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10"> {/* Aumentado gap */}
                        {/* Coluna de Itens e Frete */}
                        <div className="lg:col-span-2 space-y-8"> {/* Aumentado space-y */}
                            {/* Card de Itens */}
                            <div className="bg-gray-900 rounded-lg border border-gray-800 shadow-lg">
                                <h2 className="text-xl font-semibold p-5 border-b border-gray-700 text-amber-400">Itens no Carrinho ({cart.length})</h2>
                                <div className="divide-y divide-gray-700">
                                    {cart.map(item => {
                                        const isOnSale = item.is_on_sale && item.sale_price > 0;
                                        const currentPrice = isOnSale ? item.sale_price : item.price;
                                        const itemSubtotal = currentPrice * item.qty;
                                        return (
                                        <motion.div
                                            key={item.cartItemId}
                                            layout // Anima a remoção
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0, x: -50 }}
                                            transition={{ duration: 0.3 }}
                                            className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 gap-4"
                                        >
                                            <div className="flex items-center w-full md:w-auto flex-grow">
                                                <div
                                                    className="w-24 h-24 bg-white rounded-md flex-shrink-0 cursor-pointer p-1 border border-gray-700" // Aumentado tamanho
                                                    onClick={() => onNavigate(`product/${item.id}`)}
                                                >
                                                    <img src={getFirstImage(item.images, 'https://placehold.co/96x96/222/fff?text=Img')} alt={item.name} className="w-full h-full object-contain"/>
                                                </div>
                                                <div className="flex-grow px-4">
                                                    <h3 className="font-bold text-lg cursor-pointer hover:text-amber-400 transition line-clamp-2" onClick={() => onNavigate(`product/${item.id}`)}>{item.name}</h3>
                                                    {item.variation && (
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {item.variation.color} / {item.variation.size}
                                                        </p>
                                                    )}
                                                    {isOnSale ? (
                                                        <div className="flex items-baseline gap-2 mt-1">
                                                            <p className="text-base text-red-500 font-bold">R$&nbsp;{Number(currentPrice).toFixed(2)}</p>
                                                            <p className="text-xs text-gray-500 line-through">R$&nbsp;{Number(item.price).toFixed(2)}</p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-base text-amber-400 mt-1">R$&nbsp;{Number(item.price).toFixed(2)}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between w-full md:w-auto gap-4 md:gap-6">
                                                {/* Controle de Quantidade */}
                                                <div className="flex items-center border border-gray-700 rounded-md overflow-hidden h-9">
                                                    <button onClick={() => handleUpdateQuantity(item.cartItemId, item.qty - 1)} className="px-3 text-lg hover:bg-gray-700 transition-colors h-full flex items-center">-</button>
                                                    <span className="w-10 text-center font-semibold text-sm border-x border-gray-700 h-full flex items-center justify-center">{item.qty}</span>
                                                    <button onClick={() => handleUpdateQuantity(item.cartItemId, item.qty + 1)} className="px-3 text-lg hover:bg-gray-700 transition-colors h-full flex items-center">+</button>
                                                </div>
                                                {/* Subtotal Item */}
                                                <p className="font-bold text-base w-24 text-right">R$&nbsp;{itemSubtotal.toFixed(2)}</p>
                                                {/* Remover Item */}
                                                <button onClick={() => removeFromCart(item.cartItemId)} className="text-gray-500 hover:text-red-500 transition-colors" title="Remover item">
                                                    <TrashIcon className="h-5 w-5"/>
                                                </button>
                                            </div>
                                        </motion.div>
                                        )
                                    })}
                                </div>
                                <div className="p-5 border-t border-gray-700 text-right">
                                     <button onClick={() => onNavigate('products')} className="text-amber-400 hover:underline text-sm font-semibold flex items-center gap-1.5 ml-auto w-fit">
                                        <PlusIcon className="h-4 w-4"/> Continuar Comprando
                                    </button>
                                </div>
                            </div>
                            {/* Calculadora de Frete (mantém componente externo) */}
                            <ShippingCalculator items={cart} />
                        </div>

                        {/* Coluna de Resumo */}
                        <div className="lg:col-span-1">
                            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 shadow-lg h-fit lg:sticky lg:top-28">
                                <h2 className="text-2xl font-bold mb-6 text-center text-amber-400">Resumo do Pedido</h2>
                                <div className="space-y-3 mb-5 border-b border-gray-700 pb-5">
                                    <div className="flex justify-between text-gray-300 text-sm"><span>Subtotal Produtos</span><span>R$&nbsp;{subtotal.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-gray-300 text-sm">
                                        <span>Frete</span>
                                        {isLoadingShipping ? (
                                            <SpinnerIcon className="h-5 w-5 text-amber-400" />
                                        ) : autoCalculatedShipping ? (
                                            <span>{shippingCost > 0 ? `R$ ${shippingCost.toFixed(2)}` : 'Grátis'}</span>
                                        ) : (
                                            <span className="text-xs text-gray-500">Selecione o CEP</span>
                                        )}
                                    </div>
                                    {shippingError && <p className="text-red-400 text-xs text-right -mt-2">{shippingError}</p>}
                                    {appliedCoupon && (
                                        <div className="flex justify-between text-green-400 text-sm">
                                            <span>Desconto ({appliedCoupon.code})</span>
                                            <span>- R$&nbsp;{discount.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-between font-bold text-xl mb-6">
                                    <span>Total</span>
                                    <span className="text-amber-400">R$&nbsp;{total.toFixed(2)}</span>
                                </div>

                                {/* Seção do Cupom */}
                                <div className="mb-6">
                                    {!appliedCoupon ? (
                                        <>
                                        <form onSubmit={handleApplyCoupon} className="flex space-x-2">
                                            <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} type="text" placeholder="Código do Cupom" className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 text-sm" />
                                            <button type="submit" className="px-4 bg-amber-400 text-black font-bold rounded-md hover:bg-amber-300 text-sm transition-colors">Aplicar</button>
                                        </form>
                                        {couponMessage && <p className={`text-xs mt-2 text-center ${couponMessage.includes('aplicado') ? 'text-green-400' : 'text-red-400'}`}>{couponMessage}</p>}
                                        </>
                                    ) : (
                                        <div className="flex justify-between items-center bg-green-900/50 p-3 rounded-md border border-green-700">
                                            <p className="text-sm text-green-300 flex items-center gap-2"><CheckCircleIcon className="h-5 w-5"/> Cupom <strong>{appliedCoupon.code}</strong> aplicado!</p>
                                            <button onClick={removeCoupon} className="text-xs text-red-400 hover:underline flex-shrink-0">Remover</button>
                                        </div>
                                    )}
                                </div>

                                {/* Botão Checkout */}
                                <button
                                    onClick={() => onNavigate('checkout')}
                                    className="w-full bg-gradient-to-r from-amber-400 to-amber-500 text-black py-3.5 rounded-md hover:from-amber-300 hover:to-amber-400 font-bold text-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:bg-gray-600 flex items-center justify-center gap-2"
                                    disabled={!autoCalculatedShipping || cart.length === 0}
                                >
                                    <CheckBadgeIcon className="h-5 w-5" />
                                    Finalizar Compra
                                </button>
                                {!autoCalculatedShipping && cart.length > 0 && <p className="text-center text-xs text-red-400 mt-3">Calcule o frete para continuar.</p>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
// NOVO COMPONENTE: WishlistItemCard
const WishlistItemCard = memo(({ item, onRemove, onNavigate }) => {
    const { addToCart } = useShop(); // Pega addToCart do contexto
    const notification = useNotification();
    const [isAddingToCart, setIsAddingToCart] = useState(false);

    const imageUrl = getFirstImage(item.images);
    const isOnSale = !!(item.is_on_sale && item.sale_price > 0 && Number(item.price) > Number(item.sale_price));
    const currentPrice = isOnSale ? item.sale_price : item.price;
    const isOutOfStock = item.stock <= 0;

    const handleAddToCart = async (e) => {
        e.stopPropagation();
        if (item.product_type === 'clothing') {
            notification.show("Escolha cor e tamanho na página do produto.", "error");
            onNavigate(`product/${item.id}`);
            return;
        }
        if (isOutOfStock) {
             notification.show("Este item está fora de estoque.", "error");
             return;
        }

        setIsAddingToCart(true);
        try {
            await addToCart(item, 1);
            notification.show(`${item.name} adicionado ao carrinho!`);
        } catch (error) {
            notification.show(error.message || "Erro ao adicionar ao carrinho", "error");
        } finally {
            setIsAddingToCart(false);
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
    };

    return (
        <motion.div
            layout // Garante animação suave ao remover
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden flex flex-col h-full"
        >
            <div className="relative h-48 sm:h-56 bg-white overflow-hidden group">
                <img
                    src={imageUrl}
                    alt={item.name}
                    className="w-full h-full object-contain cursor-pointer transition-transform duration-300 group-hover:scale-105"
                    onClick={() => onNavigate(`product/${item.id}`)}
                />
                 {isOutOfStock && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md z-10">ESGOTADO</div>
                )}
                {isOnSale && !isOutOfStock && (
                     <div className="absolute top-2 right-2 bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md z-10">OFERTA</div>
                )}
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <div className="flex-grow">
                    <p className="text-xs text-amber-400 font-semibold tracking-wider mb-1">{item.brand?.toUpperCase()}</p>
                    <h4
                        className="text-base font-bold tracking-tight cursor-pointer hover:text-amber-400 line-clamp-2"
                        onClick={() => onNavigate(`product/${item.id}`)}
                        title={item.name}
                    >
                        {item.name}
                    </h4>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-700">
                    {isOnSale ? (
                        <div>
                            <p className="text-sm font-light text-gray-500 line-through">R$ {Number(item.price).toFixed(2).replace('.', ',')}</p>
                            <p className="text-xl font-bold text-red-500">R$ {Number(currentPrice).toFixed(2).replace('.', ',')}</p>
                        </div>
                    ) : (
                        <p className="text-xl font-semibold text-white">R$ {Number(currentPrice).toFixed(2).replace('.', ',')}</p>
                    )}
                </div>

                <div className="mt-4 flex gap-2">
                    <button
                        onClick={handleAddToCart}
                        disabled={isAddingToCart || isOutOfStock}
                        className={`flex-grow ${isOutOfStock ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-amber-400 text-black hover:bg-amber-300'} transition font-bold py-2 px-3 rounded-md text-sm flex items-center justify-center gap-2 disabled:opacity-70`}
                    >
                        {isAddingToCart ? <SpinnerIcon className="h-5 w-5"/> : <CartIcon className="h-5 w-5"/>}
                        {isOutOfStock ? 'Esgotado' : (item.product_type === 'clothing' ? 'Ver Opções' : 'Add Carrinho')}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemove(item); }}
                        title="Remover da lista"
                        className="flex-shrink-0 border border-gray-700 text-gray-400 p-2 rounded-md hover:bg-red-900/50 hover:border-red-700 hover:text-red-400 transition"
                    >
                        <TrashIcon className="h-5 w-5"/>
                    </button>
                </div>
            </div>
        </motion.div>
    );
});


const WishlistPage = ({ onNavigate }) => {
    const { wishlist, removeFromWishlist } = useShop(); // Pegar addToCart foi removido daqui
    const notification = useNotification();

    const handleRemove = async (item) => {
        await removeFromWishlist(item.id);
        notification.show(`${item.name} removido da lista de desejos.`, 'error');
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 } // Anima os filhos em sequência
        }
    };

    return (
        <div className="bg-black text-white min-h-screen py-12">
            <div className="container mx-auto px-4">
                <h1 className="text-3xl md:text-4xl font-bold mb-10 text-center">Lista de Desejos</h1>
                {wishlist.length === 0 ? (
                    <EmptyState
                        icon={<HeartIcon className="h-12 w-12"/>}
                        title="Sua lista de desejos está vazia"
                        message="Adicione produtos que você ama para encontrá-los facilmente mais tarde."
                        buttonText="Ver Produtos"
                        onButtonClick={() => onNavigate('products')}
                    />
                ) : (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                    >
                        <AnimatePresence>
                            {wishlist.map(item => (
                                <WishlistItemCard
                                    key={item.id}
                                    item={item}
                                    onRemove={handleRemove}
                                    onNavigate={onNavigate}
                                    // onAddToCart não é mais passado, pois o card lida com isso
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

const AddressForm = ({ initialData = {}, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        alias: '',
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        localidade: '',
        uf: '',
        is_default: false,
        ...initialData
    });
    const [isSaving, setIsSaving] = useState(false);
    const notification = useNotification();

    const handleCepLookup = useCallback(async (cepValue) => {
        const cep = cepValue.replace(/\D/g, '');
        if (cep.length !== 8) return;
        
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            if (!response.ok) throw new Error('Falha na resposta da API de CEP.');
            
            const data = await response.json();
            if (!data.erro) {
                setFormData(prev => ({ 
                    ...prev, 
                    logradouro: data.logradouro, 
                    bairro: data.bairro, 
                    localidade: data.localidade, 
                    uf: data.uf
                }));
            } else {
                notification.show("CEP não encontrado.", "error");
            }
        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
            notification.show("Não foi possível buscar o CEP. Tente novamente.", "error");
        }
    }, [notification]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleCepChange = (e) => {
        const newCep = maskCEP(e.target.value);
        setFormData(prev => ({ ...prev, cep: newCep }));
        if (newCep.replace(/\D/g, '').length === 8) {
            handleCepLookup(newCep);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        await onSave(formData);
        setIsSaving(false);
    };
    
    const isFormValid = useMemo(() => {
        const { alias, cep, logradouro, numero, bairro, localidade, uf } = formData;
        return alias && cep.replace(/\D/g, '').length === 8 && logradouro && numero && bairro && localidade && uf;
    }, [formData]);

    return (
        <form onSubmit={handleSubmit} className="space-y-4 text-gray-800">
            <input name="alias" value={formData.alias} onChange={handleChange} placeholder="Apelido do Endereço (ex: Casa, Trabalho)" className="w-full p-3 bg-gray-100 border border-gray-300 rounded-md" required />
            <input name="cep" value={formData.cep} onChange={handleCepChange} placeholder="CEP" className="w-full p-3 bg-gray-100 border border-gray-300 rounded-md" required />
            <input name="logradouro" value={formData.logradouro} onChange={handleChange} placeholder="Rua / Logradouro" className="w-full p-3 bg-gray-100 border border-gray-300 rounded-md" required />
            <div className="flex space-x-4">
                <input name="numero" value={formData.numero} onChange={handleChange} placeholder="Número" className="w-1/2 p-3 bg-gray-100 border border-gray-300 rounded-md" required />
                <input name="complemento" value={formData.complemento} onChange={handleChange} placeholder="Complemento (Opcional)" className="w-1/2 p-3 bg-gray-100 border border-gray-300 rounded-md" />
            </div>
            <input name="bairro" value={formData.bairro} onChange={handleChange} placeholder="Bairro" className="w-full p-3 bg-gray-100 border border-gray-300 rounded-md" required />
            <div className="flex space-x-4">
                <input name="localidade" value={formData.localidade} onChange={handleChange} placeholder="Cidade" className="flex-grow p-3 bg-gray-100 border border-gray-300 rounded-md" required />
                <input name="uf" value={formData.uf} onChange={handleChange} placeholder="UF" className="w-1/4 p-3 bg-gray-100 border border-gray-300 rounded-md" required />
            </div>
            <div className="flex items-center">
                <input type="checkbox" id="is_default" name="is_default" checked={formData.is_default} onChange={handleChange} className="h-4 w-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500" />
                <label htmlFor="is_default" className="ml-2 block text-sm text-gray-700">Salvar como endereço padrão</label>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
                <button type="submit" disabled={!isFormValid || isSaving} className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 disabled:bg-gray-400 flex items-center justify-center">
                    {isSaving ? <SpinnerIcon /> : 'Salvar Endereço'}
                </button>
            </div>
        </form>
    );
};

const AddressSelectionModal = ({ isOpen, onClose, addresses, onSelectAddress, onAddNewAddress }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Selecione um Endereço de Entrega" size="md">
            <div className="space-y-3">
                {addresses.map(addr => (
                    <div 
                        key={addr.id} 
                        onClick={() => onSelectAddress(addr)}
                        className="p-4 border-2 rounded-lg cursor-pointer transition-all bg-gray-50 hover:border-amber-400 hover:bg-amber-50"
                    >
                        <p className="font-bold text-gray-800">{addr.alias} {addr.is_default ? <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full ml-2">Padrão</span> : ''}</p>
                        <p className="text-sm text-gray-600">{addr.logradouro}, {addr.numero}</p>
                        <p className="text-sm text-gray-500">{addr.bairro}, {addr.localidade} - {addr.uf}</p>
                        <p className="text-sm text-gray-500">{addr.cep}</p>
                    </div>
                ))}
                {addresses.length < 5 && (
                    <button 
                        onClick={onAddNewAddress}
                        className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-amber-400 hover:text-amber-600 transition-colors"
                    >
                        <PlusCircleIcon className="h-6 w-6" />
                        <span>Adicionar Novo Endereço</span>
                    </button>
                )}
            </div>
        </Modal>
    );
};

// Componente PickupPersonForm REMOVIDO. Inputs voltam a ser nativos.

const CheckoutPage = ({ onNavigate }) => {
    // console.log(`%c--- Rendering CheckoutPage ---`, 'color: yellow; font-weight: bold;'); // Log opcional
    const { user } = useAuth();
    const {
        cart,
        autoCalculatedShipping,
        appliedCoupon,
        clearOrderState,
        addresses,
        fetchAddresses,
        shippingLocation,
        setShippingLocation,
        shippingOptions,
        setAutoCalculatedShipping,
        setSelectedShippingName
    } = useShop();
    const notification = useNotification();

    const [displayAddress, setDisplayAddress] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('mercadopago');
    const [isLoading, setIsLoading] = useState(false);
    const [isAddressLoading, setIsAddressLoading] = useState(true);
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    const [isNewAddressModalOpen, setIsNewAddressModalOpen] = useState(false);
    const [isSomeoneElsePickingUp, setIsSomeoneElsePickingUp] = useState(false);

    // Estados que armazenam o valor FINAL (atualizado no onBlur)
    const [pickupPersonName, setPickupPersonName] = useState('');
    const [pickupPersonCpf, setPickupPersonCpf] = useState('');

    // --- REMOVIDO: Estado visual 'displayPickupCpf' não é mais necessário ---

    // --- Efeito para buscar e definir endereço inicial ---
    // (Lógica mantida)
    useEffect(() => {
        setIsAddressLoading(true);
        fetchAddresses().then(userAddresses => {
            let addressToSet = null;
            if (shippingLocation && shippingLocation.cep) {
                const matchingSavedAddress = userAddresses.find(addr =>
                    addr.cep === shippingLocation.cep &&
                    (shippingLocation.alias && !shippingLocation.alias.startsWith('CEP ') && shippingLocation.alias !== 'Localização Atual' ? addr.alias === shippingLocation.alias : true)
                );
                if (matchingSavedAddress) {
                    addressToSet = matchingSavedAddress;
                } else {
                    addressToSet = {
                        cep: shippingLocation.cep, localidade: shippingLocation.city, uf: shippingLocation.state, alias: shippingLocation.alias,
                        logradouro: '', numero: '', bairro: '', is_default: false, id: Date.now()
                    };
                }
            }
            if (!addressToSet) {
                addressToSet = userAddresses.find(addr => addr.is_default) || userAddresses[0] || null;
            }
            setDisplayAddress(addressToSet);

            if (addressToSet && addressToSet.cep !== shippingLocation?.cep) {
                 setShippingLocation({
                    cep: addressToSet.cep, city: addressToSet.localidade, state: addressToSet.uf, alias: addressToSet.alias
                 });
            }
        }).finally(() => {
            setIsAddressLoading(false);
        });
    }, [fetchAddresses, shippingLocation, setShippingLocation]);

    // --- Efeito para definir os VALORES INICIAIS (para defaultValue) ---
    // (Aplica máscara no CPF aqui para valor inicial)
    useEffect(() => {
        if (user && !isSomeoneElsePickingUp) {
            setPickupPersonName(user.name || '');
            setPickupPersonCpf(maskCPF(user.cpf || '')); // Define o valor principal já mascarado
        } else {
            // Limpa o estado principal
            setPickupPersonName('');
            setPickupPersonCpf('');
        }
    }, [user, isSomeoneElsePickingUp]);


    // --- Funções de seleção de frete/endereço ---
    const handleSelectShipping = (option) => {
        setAutoCalculatedShipping(option);
        setSelectedShippingName(option.name);
        if(option.isPickup) {
            setDisplayAddress(null);
            // Redefine valores iniciais ao selecionar Retirada
            if (!isSomeoneElsePickingUp && user) {
                setPickupPersonName(user.name || '');
                setPickupPersonCpf(maskCPF(user.cpf || '')); // Define estado principal
            } else {
                 setPickupPersonName('');
                 setPickupPersonCpf('');
            }
        } else if (!displayAddress && addresses.length > 0) {
             const defaultOrFirst = addresses.find(addr => addr.is_default) || addresses[0];
             if (defaultOrFirst) {
                setDisplayAddress(defaultOrFirst);
                setShippingLocation({ cep: defaultOrFirst.cep, city: defaultOrFirst.localidade, state: defaultOrFirst.uf, alias: defaultOrFirst.alias });
             }
        }
    };
    const handleAddressSelection = (address) => {
        setDisplayAddress(address);
        setShippingLocation({ cep: address.cep, city: address.localidade, state: address.uf, alias: address.alias });
        setIsAddressModalOpen(false);
    };
    const handleAddNewAddress = () => {
        setIsAddressModalOpen(false);
        setIsNewAddressModalOpen(true);
    };
    const handleSaveNewAddress = async (formData) => {
        try {
            const savedAddress = await apiService('/addresses', 'POST', formData);
            notification.show('Endereço salvo com sucesso!');
            const updatedAddresses = await fetchAddresses();
            const newAddress = updatedAddresses.find(a => a.id === savedAddress.id) || savedAddress;
            setDisplayAddress(newAddress);
            setShippingLocation({ cep: newAddress.cep, city: newAddress.localidade, state: newAddress.uf, alias: newAddress.alias });
            setIsNewAddressModalOpen(false);
        } catch (error) {
            notification.show(`Erro ao salvar endereço: ${error.message}`, 'error');
        }
    };

    // --- Cálculos de Valores (COM CORREÇÃO NaN) ---
    const subtotal = useMemo(() => {
        return cart.reduce((sum, item) => {
            const price = Number(item.is_on_sale && item.sale_price ? item.sale_price : item.price) || 0;
            const quantity = Number(item.qty) || 0;
            return sum + (price * quantity);
        }, 0);
    }, [cart]);
    const shippingCost = useMemo(() => {
        return Number(autoCalculatedShipping?.price) || 0;
    }, [autoCalculatedShipping]);
    const discount = useMemo(() => {
        if (!appliedCoupon) return 0;
        let val = 0;
        const couponValue = Number(appliedCoupon.value) || 0;
        const currentSubtotal = Number(subtotal) || 0;
        const currentShippingCost = Number(shippingCost) || 0;
        if (appliedCoupon.type === 'percentage') {
            val = currentSubtotal * (couponValue / 100);
        } else if (appliedCoupon.type === 'fixed') {
            val = couponValue;
        } else if (appliedCoupon.type === 'free_shipping') {
            val = currentShippingCost;
        }
        const currentTotalBeforeDiscount = currentSubtotal + currentShippingCost;
        return Math.max(0, (appliedCoupon.type !== 'free_shipping' && val > currentTotalBeforeDiscount) ? currentTotalBeforeDiscount : val);
    }, [appliedCoupon, subtotal, shippingCost]);
    const total = useMemo(() => {
        const finalTotal = (Number(subtotal) || 0) - (Number(discount) || 0) + (Number(shippingCost) || 0);
        return Math.max(0, finalTotal);
    }, [subtotal, discount, shippingCost]);

    // --- Finalizar Pedido (usa pickupPersonCpf) ---
    const handlePlaceOrderAndPay = async () => {
        const isPickup = autoCalculatedShipping?.isPickup;
        if ((!displayAddress && !isPickup) || !paymentMethod || !autoCalculatedShipping) {
            notification.show("Selecione a forma de entrega e o endereço (se aplicável).", 'error'); return;
        }
        const nameToCheck = isSomeoneElsePickingUp ? pickupPersonName : user?.name;
        const cpfToCheck = isSomeoneElsePickingUp ? pickupPersonCpf : user?.cpf;
        if (isPickup && (!nameToCheck || !validateCPF(cpfToCheck))) {
            if(!isSomeoneElsePickingUp && !user) {
                 notification.show("Faça login ou marque 'Outra pessoa vai retirar?' e preencha os dados.", 'error');
            } else {
                notification.show("Preencha nome e CPF válidos para quem vai retirar.", 'error');
            }
            return;
        }

        setIsLoading(true);
        try {
            const finalShippingAddress = (isPickup || !displayAddress || !displayAddress.id) ? null : displayAddress;
            const cpfToSend = (isSomeoneElsePickingUp ? pickupPersonCpf : user?.cpf)?.replace(/\D/g, '') || '';
            const nameToSend = isSomeoneElsePickingUp ? pickupPersonName : user?.name;

            const orderPayload = {
                items: cart.map(item => ({ id: item.id, qty: item.qty, price: (item.is_on_sale && item.sale_price ? item.sale_price : item.price), variation: item.variation })),
                total, shippingAddress: finalShippingAddress, paymentMethod,
                shipping_method: autoCalculatedShipping.name, shipping_cost: shippingCost,
                coupon_code: appliedCoupon?.code || null, discount_amount: discount,
                pickup_details: isPickup ? JSON.stringify({ personName: nameToSend, personCpf: cpfToSend }) : null,
            };
            const { orderId } = await apiService('/orders', 'POST', orderPayload);

            if (paymentMethod === 'mercadopago') {
                sessionStorage.setItem('pendingOrderId', orderId);
                const { init_point } = await apiService('/create-mercadopago-payment', 'POST', { orderId });
                if (init_point) window.location.href = init_point;
                else throw new Error("Link de pagamento não obtido.");
            } else {
                clearOrderState();
                onNavigate(`order-success/${orderId}`);
            }
        } catch (error) {
            notification.show(`Erro: ${error.message}`, 'error');
            setIsLoading(false);
        }
    };

    // --- Funções Auxiliares ---
    const getShippingName = (name) => name?.toLowerCase().includes('pac') ? 'PAC' : (name || 'N/A');
    // CORREÇÃO: Função getDeliveryDateText (mantida da correção anterior)
    const getDeliveryDateText = (deliveryTime) => {
        const timeInDays = Number(deliveryTime);
        if (isNaN(timeInDays) || timeInDays <= 0) return 'Prazo indisponível';

        const date = new Date();
        let addedBusinessDays = 0;
        date.setDate(date.getDate() + 1);
        if (date.getDay() === 0) date.setDate(date.getDate() + 1);
        else if (date.getDay() === 6) date.setDate(date.getDate() + 2);

        while (addedBusinessDays < timeInDays) {
            date.setDate(date.getDate() + 1);
            if (date.getDay() !== 0 && date.getDay() !== 6) {
                addedBusinessDays++;
            }
        }
        return `Previsão: ${date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}`;
    };

    // --- Componente de Seção ---
    const CheckoutSection = ({ title, step, children, icon: Icon }) => (
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

    // --- Handlers para os inputs de retirada (AMBOS com onBlur) ---
    const handlePickupNameBlur = (e) => {
        setPickupPersonName(e.target.value); // Atualiza o estado principal no blur
    };

    // Handler para aplicar máscara VISUALMENTE no CPF a cada digitação (onInput)
    const handleCpfInputChangeMask = (e) => {
        e.target.value = maskCPF(e.target.value); // Manipula o DOM
    };

    // Handler para atualizar o estado PRINCIPAL do CPF no blur
    const handlePickupCpfBlur = (e) => {
        setPickupPersonCpf(maskCPF(e.target.value)); // Atualiza estado principal
    };


    return (
        <>
            {/* Modais */}
            <AddressSelectionModal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} addresses={addresses} onSelectAddress={handleAddressSelection} onAddNewAddress={handleAddNewAddress} />
            <Modal isOpen={isNewAddressModalOpen} onClose={() => setIsNewAddressModalOpen(false)} title="Adicionar Novo Endereço"><AddressForm onSave={handleSaveNewAddress} onCancel={() => setIsNewAddressModalOpen(false)} /></Modal>

            {/* Conteúdo da Página */}
            <div className="bg-black text-white min-h-screen py-8 sm:py-12">
                <div className="container mx-auto px-4">
                    {/* Botão Voltar */}
                    <button onClick={() => onNavigate('cart')} className="text-sm text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 mb-6 w-fit bg-gray-800/50 hover:bg-gray-700/50 px-3 py-1.5 rounded-md border border-gray-700">
                        <ArrowUturnLeftIcon className="h-4 w-4"/> Voltar ao Carrinho
                    </button>

                    <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center sm:text-left">Finalizar Pedido</h1>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">

                        {/* Coluna Esquerda */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Seção Forma de Entrega */}
                            <CheckoutSection title="Forma de Entrega" step={1} icon={TruckIcon}>
                                <div className="space-y-3">
                                    {shippingOptions.map(option => (
                                        <div key={option.name} onClick={() => handleSelectShipping(option)}
                                             className={`relative p-4 rounded-lg border-2 transition cursor-pointer flex items-center justify-between gap-4 ${autoCalculatedShipping?.name === option.name ? 'border-amber-400 bg-gray-800 shadow-inner' : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'}`}>
                                            <div className="absolute top-3 left-3 w-5 h-5 flex items-center justify-center">
                                                <div className={`w-4 h-4 rounded-full border-2 ${autoCalculatedShipping?.name === option.name ? 'border-amber-400' : 'border-gray-500'}`}>
                                                    {autoCalculatedShipping?.name === option.name && <div className="w-full h-full p-0.5"><div className="w-full h-full rounded-full bg-amber-400"></div></div>}
                                                </div>
                                            </div>
                                            <div className="pl-8 flex-grow">
                                                <span className="font-bold text-base">{option.name}</span>
                                                <p className="text-xs text-gray-400 mt-0.5">{option.isPickup ? `Retire em nosso endereço físico.` : getDeliveryDateText(option.delivery_time)}</p>
                                            </div>
                                            <span className="font-bold text-amber-400 text-lg flex-shrink-0">{option.price > 0 ? `R$ ${option.price.toFixed(2)}` : 'Grátis'}</span>
                                        </div>
                                    ))}
                                </div>
                            </CheckoutSection>

                            {/* Seção Endereço ou Detalhes de Retirada */}
                            {autoCalculatedShipping?.isPickup ? (
                                <CheckoutSection title="Detalhes da Retirada" icon={BoxIcon}>
                                     <div className="text-sm bg-gray-800 p-4 rounded-md space-y-2 border border-gray-700">
                                        <p className="font-bold">Endereço:</p>
                                        <p>R. Leopoldo Pereira Lima, 378 – Mangabeira VIII, João Pessoa – PB, 58059-123</p>
                                        <p className="font-bold mt-2">Horário:</p>
                                        <p>Seg a Sáb: 09h-11h30 e 15h-17h30 (exceto feriados)</p>
                                        <p className="text-amber-300 text-xs mt-2 font-semibold">Aguarde a notificação "Pronto para Retirada".</p>
                                    </div>
                                    <div className="mt-5 space-y-3">
                                        <div className="flex items-center">
                                            <input type="checkbox" id="pickup-checkbox" checked={isSomeoneElsePickingUp} onChange={(e) => setIsSomeoneElsePickingUp(e.target.checked)} className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-600 ring-offset-gray-900"/>
                                            <label htmlFor="pickup-checkbox" className="ml-2 text-sm text-gray-300">Outra pessoa vai retirar?</label>
                                        </div>
                                        {/* --- CORREÇÃO: Usando defaultValue + onBlur para AMBOS --- */}
                                        {isSomeoneElsePickingUp && (
                                            <div
                                                // Key para forçar remonte com defaultValue correto
                                                key={isSomeoneElsePickingUp ? "pickup-form-on" : "pickup-form-off"}
                                                className="space-y-2 overflow-hidden bg-gray-800 p-3 rounded-md border border-gray-700"
                                            >
                                                {/* Input de Nome NÃO CONTROLADO (como funcionava) */}
                                                <input
                                                    type="text"
                                                    defaultValue={pickupPersonName} // Valor inicial
                                                    onBlur={handlePickupNameBlur} // Atualiza estado no blur
                                                    placeholder="Nome completo de quem vai retirar"
                                                    className="w-full p-2 bg-gray-700 border-gray-600 border rounded text-sm"
                                                />
                                                {/* Input de CPF NÃO CONTROLADO (mesma lógica do Nome) */}
                                                <input
                                                    type="text"
                                                    defaultValue={pickupPersonCpf} // Valor inicial (já mascarado)
                                                    onInput={handleCpfInputChangeMask} // Aplica máscara VISUALMENTE
                                                    onBlur={handlePickupCpfBlur} // Atualiza estado PRINCIPAL no blur
                                                    placeholder="CPF de quem vai retirar"
                                                    maxLength="14" // Limite visual
                                                    className="w-full p-2 bg-gray-700 border-gray-600 border rounded text-sm"
                                                />
                                            </div>
                                        )}
                                        {/* --- FIM DA CORREÇÃO --- */}
                                    </div>
                                </CheckoutSection>
                            ) : (
                                <CheckoutSection title="Endereço de Entrega" icon={MapPinIcon}>
                                     {isAddressLoading ? (
                                        <div className="flex justify-center items-center h-24"><SpinnerIcon className="h-6 w-6 text-amber-400"/></div>
                                    ) : displayAddress ? (
                                        <div className="p-4 bg-gray-800 rounded-md border border-gray-700">
                                            <div className="flex justify-between items-start">
                                                <p className="font-bold text-lg mb-2 text-white">{displayAddress.alias}</p>
                                                {displayAddress.is_default && <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-semibold">Padrão</span>}
                                            </div>
                                            <div className="space-y-1 text-gray-300 text-sm">
                                                <p><span className="font-semibold text-gray-500 w-16 inline-block">Rua:</span> {displayAddress.logradouro || 'N/A'}</p>
                                                <p><span className="font-semibold text-gray-500 w-16 inline-block">Nº:</span> {displayAddress.numero || 'N/A'} {displayAddress.complemento && `- ${displayAddress.complemento}`}</p>
                                                <p><span className="font-semibold text-gray-500 w-16 inline-block">Bairro:</span> {displayAddress.bairro || 'N/A'}</p>
                                                <p><span className="font-semibold text-gray-500 w-16 inline-block">Cidade:</span> {displayAddress.localidade || 'N/A'} - {displayAddress.uf || 'N/A'}</p>
                                                <p><span className="font-semibold text-gray-500 w-16 inline-block">CEP:</span> {displayAddress.cep || 'N/A'}</p>
                                            </div>
                                            <button onClick={() => setIsAddressModalOpen(true)} className="text-amber-400 hover:text-amber-300 mt-4 font-semibold text-sm flex items-center gap-1">
                                                <EditIcon className="h-4 w-4"/> Alterar Endereço
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center p-6 bg-gray-800 rounded-md border border-gray-700">
                                            <MapPinIcon className="h-10 w-10 mx-auto text-gray-500 mb-3"/>
                                            <p className="text-gray-400 mb-4 text-sm">Nenhum endereço selecionado ou cadastrado.</p>
                                            <button onClick={() => setIsNewAddressModalOpen(true)} className="bg-amber-500 text-black px-5 py-2 rounded-md hover:bg-amber-400 font-bold text-sm flex items-center gap-2 mx-auto">
                                                <PlusIcon className="h-4 w-4"/> Adicionar Endereço
                                            </button>
                                        </div>
                                    )}
                                </CheckoutSection>
                            )}

                            {/* Seção Forma de Pagamento */}
                            <CheckoutSection title="Forma de Pagamento" step={2} icon={CreditCardIcon}>
                                <div className="space-y-3">
                                    <div onClick={() => setPaymentMethod('mercadopago')}
                                         className={`relative p-4 rounded-lg border-2 transition cursor-pointer flex items-center gap-4 ${paymentMethod === 'mercadopago' ? 'border-amber-400 bg-gray-800 shadow-inner' : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'}`}>
                                        <div className="absolute top-3 left-3 w-5 h-5 flex items-center justify-center">
                                            <div className={`w-4 h-4 rounded-full border-2 ${paymentMethod === 'mercadopago' ? 'border-amber-400' : 'border-gray-500'}`}>
                                                {paymentMethod === 'mercadopago' && <div className="w-full h-full p-0.5"><div className="w-full h-full rounded-full bg-amber-400"></div></div>}
                                            </div>
                                        </div>
                                        <div className="pl-8 flex-grow">
                                            <span className="font-bold text-base text-white">Mercado Pago</span>
                                            <p className="text-xs text-gray-400 mt-0.5">Cartão de Crédito, Pix ou Boleto.</p>
                                        </div>
                                    </div>
                                </div>
                            </CheckoutSection>
                        </div> 

                        {/* Coluna Direita: Resumo */}
                        <div className="lg:col-span-1">
                             <div className="bg-gray-900 rounded-lg border border-gray-800 p-5 lg:p-6 shadow-lg h-fit lg:sticky lg:top-24">
                                <h2 className="text-xl font-bold mb-5 text-amber-400 border-b border-gray-700 pb-3">Resumo do Pedido</h2>
                                <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-2">
                                    {cart.map(item => (
                                        <div key={item.cartItemId} className="flex justify-between items-center text-gray-300 text-sm py-1 gap-2">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                 <img src={getFirstImage(item.images)} alt={item.name} className="w-10 h-10 object-contain bg-white rounded flex-shrink-0"/>
                                                <span className="truncate flex-grow">{item.qty}x {item.name} {item.variation ? `(${item.variation.size})` : ''}</span>
                                            </div>
                                            <span className="font-medium flex-shrink-0">R$&nbsp;{( (Number(item.is_on_sale && item.sale_price ? item.sale_price : item.price) || 0) * (Number(item.qty) || 0) ).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t border-gray-700 pt-4 space-y-2 text-sm">
                                    <div className="flex justify-between text-gray-400"><span>Subtotal</span><span className="font-medium text-gray-300">R$&nbsp;{subtotal.toFixed(2)}</span></div>
                                    {autoCalculatedShipping ? (
                                        <div className="flex justify-between text-gray-400">
                                            <span>Frete ({getShippingName(autoCalculatedShipping.name)})</span>
                                            <span className="font-medium text-gray-300">{shippingCost > 0 ? `R$ ${shippingCost.toFixed(2)}` : 'Grátis'}</span>
                                        </div>
                                    ) : (
                                        <div className="text-gray-500 text-center py-1">Calcule o frete</div>
                                    )}
                                    {appliedCoupon && (
                                        <div className="flex justify-between text-green-400">
                                            <span>Desconto ({appliedCoupon.code})</span>
                                            <span className="font-medium">- R$&nbsp;{discount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-bold text-lg text-white border-t border-gray-700 pt-3 mt-3">
                                        <span>Total</span>
                                        <span className="text-amber-400">R$&nbsp;{total.toFixed(2)}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handlePlaceOrderAndPay}
                                    disabled={(!displayAddress && !autoCalculatedShipping?.isPickup) || !paymentMethod || !autoCalculatedShipping || isLoading}
                                    className="w-full mt-6 bg-gradient-to-r from-amber-400 to-amber-500 text-black py-3 rounded-md hover:from-amber-300 hover:to-amber-400 font-bold text-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:bg-gray-600 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <SpinnerIcon className="h-6 w-6"/> : <CheckBadgeIcon className="h-6 w-6"/>}
                                    {isLoading ? 'Processando...' : 'Finalizar e Pagar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

const OrderSuccessPage = ({ orderId, onNavigate }) => {
    const { clearOrderState } = useShop();
    const [pageStatus, setPageStatus] = useState('processing');
    const [finalOrderStatus, setFinalOrderStatus] = useState('');

    const statusRef = useRef(pageStatus);
    useEffect(() => {
        statusRef.current = pageStatus;
    }, [pageStatus]);

    const pollStatus = useCallback(async () => {
        console.log(`Verificando status do pedido #${orderId}...`);
        try {
            const response = await apiService(`/orders/${orderId}/status`);
            if (response.status && response.status !== 'Pendente') {
                setFinalOrderStatus(response.status);
                setPageStatus('success');
                return true; 
            }
        } catch (err) {
            console.error("Erro ao verificar status, continuando a verificação.", err);
        }
        return false; 
    }, [orderId]);

    useEffect(() => {
        clearOrderState();
        let pollInterval;
        let timeout;

        const forceCheck = () => {
            if (statusRef.current === 'processing') {
                console.log("Forçando verificação de status (evento de visibilidade/foco)");
                pollStatus();
            }
        };

        const startPolling = async () => {
            const isFinished = await pollStatus();
            if (isFinished) return; 

            pollInterval = setInterval(async () => {
                 const finished = await pollStatus();
                 if (finished) {
                     clearInterval(pollInterval);
                     clearTimeout(timeout);
                 }
            }, 5000);
            
            timeout = setTimeout(() => {
                clearInterval(pollInterval);
                if (statusRef.current === 'processing') {
                    setPageStatus('timeout');
                }
            }, 60000);
        };

        startPolling();

        window.addEventListener('focus', forceCheck);
        window.addEventListener('pageshow', forceCheck);
        document.addEventListener('visibilitychange', forceCheck);

        return () => {
            clearInterval(pollInterval);
            clearTimeout(timeout);
            window.removeEventListener('focus', forceCheck);
            window.removeEventListener('pageshow', forceCheck);
            document.removeEventListener('visibilitychange', forceCheck);
        };
    }, [orderId, clearOrderState, pollStatus]); 


    const renderContent = () => {
        switch (pageStatus) {
            case 'success':
                return {
                    icon: <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />,
                    title: "Pagamento Aprovado!",
                    message: `Seu pedido #${orderId} foi confirmado e está com o status "${finalOrderStatus}". Já estamos preparando tudo para o envio!`
                };
            case 'timeout':
                return {
                    icon: <ClockIcon className="h-16 w-16 text-amber-500 mx-auto mb-4" />,
                    title: "Processando seu Pedido!",
                    message: `Seu pedido #${orderId} foi recebido e estamos aguardando a confirmação final do pagamento. Isso é normal para alguns métodos de pagamento. Você pode acompanhar o status atualizado na sua área de "Meus Pedidos".`
                };
     case 'processing':
            default:
                return {
                    icon: (
                        <div className="relative mb-6">
                            <SpinnerIcon className="h-16 w-16 text-amber-500 mx-auto animate-spin" />
                            <ClockIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-white" />
                        </div>
                    ),
                    title: "Confirmando Pagamento...",
                    message: "Aguarde um instante, estamos confirmando seu pagamento com a operadora."
                };
        }
    };

    const { icon, title, message } = renderContent();

    return (
        <div className="bg-black text-white min-h-screen flex items-center justify-center p-4">
            <div className="text-center p-8 bg-gray-900 rounded-lg shadow-lg border border-gray-800 max-w-lg w-full">
                {icon}
                <h1 className="text-2xl sm:text-3xl font-bold text-amber-400 mb-2">{title}</h1>
                <p className="text-gray-300 mb-6">{message}</p>
                <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
                    <button onClick={() => onNavigate('account')} className="bg-amber-500 text-black px-6 py-2 rounded-md font-bold hover:bg-amber-400">Ver Meus Pedidos</button>
                    <button onClick={() => onNavigate('home')} className="bg-gray-700 text-white px-6 py-2 rounded-md font-bold hover:bg-gray-600">Voltar à Página Inicial</button>
                </div>
            </div>
        </div>
    );
};

const OrderStatusTimeline = ({ history, currentStatus, onStatusClick }) => {
    const STATUS_DEFINITIONS = useMemo(() => ({
        'Pendente': { title: 'Pedido Pendente', description: 'Aguardando a confirmação do pagamento. Se você pagou com boleto, pode levar até 2 dias úteis.', icon: <ClockIcon className="h-6 w-6" />, color: 'amber' },
        'Pagamento Aprovado': { title: 'Pagamento Aprovado', description: 'Recebemos seu pagamento! Agora, estamos preparando seu pedido para o envio.', icon: <CheckBadgeIcon className="h-6 w-6" />, color: 'green' },
        'Pagamento Recusado': { title: 'Pagamento Recusado', description: 'A operadora não autorizou o pagamento. Por favor, tente novamente ou use outra forma de pagamento.', icon: <XCircleIcon className="h-6 w-6" />, color: 'red' },
        'Separando Pedido': { title: 'Separando Pedido', description: 'Seu pedido está sendo cuidadosamente separado e embalado em nosso estoque.', icon: <PackageIcon className="h-6 w-6" />, color: 'blue' },
        'Enviado': { title: 'Pedido Enviado', description: 'Seu pedido foi coletado pela transportadora e está a caminho do seu endereço. Use o código de rastreio para acompanhar.', icon: <TruckIcon className="h-6 w-6" />, color: 'blue' },
        'Saiu para Entrega': { title: 'Saiu para Entrega', description: 'O carteiro ou entregador saiu com sua encomenda para fazer a entrega no seu endereço hoje.', icon: <TruckIcon className="h-6 w-6" />, color: 'blue' },
        'Entregue': { title: 'Pedido Entregue', description: 'Seu pedido foi entregue com sucesso! Esperamos que goste.', icon: <HomeIcon className="h-6 w-6" />, color: 'green' },
        'Cancelado': { title: 'Pedido Cancelado', description: 'Este pedido foi cancelado. Se tiver alguma dúvida, entre em contato conosco.', icon: <XCircleIcon className="h-6 w-6" />, color: 'red' },
        'Reembolsado': { title: 'Pedido Reembolsado', description: 'O valor deste pedido foi estornado. O prazo para aparecer na sua fatura depende da operadora do cartão.', icon: <CurrencyDollarIcon className="h-6 w-6" />, color: 'gray' }
    }), []);

    const colorClasses = useMemo(() => ({
        amber: { bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500' },
        green: { bg: 'bg-green-500', text: 'text-green-400', border: 'border-green-500' },
        blue:  { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500' },
        red:   { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500' },
        gray:  { bg: 'bg-gray-700', text: 'text-gray-500', border: 'border-gray-600' }
    }), []);
    
    const timelineOrder = useMemo(() => [
        'Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Enviado', 'Saiu para Entrega', 'Entregue'
    ], []);

    // FILTRO DE SEGURANÇA: Garante que o histórico seja sempre uma lista válida de objetos com status.
    const historyMap = useMemo(() =>
        new Map(
            (Array.isArray(history) ? history : [])
                .filter(h => h && typeof h === 'object' && h.status)
                .map(h => [h.status, h])
        )
    , [history]);
    
    const currentStatusIndex = timelineOrder.indexOf(currentStatus);

    if (['Cancelado', 'Pagamento Recusado', 'Reembolsado'].includes(currentStatus)) {
        const specialStatus = STATUS_DEFINITIONS[currentStatus];
        if (!specialStatus) return <div className="p-4 bg-red-100 text-red-700 rounded-md">Status desconhecido: {currentStatus}</div>;

        const specialClasses = colorClasses[specialStatus.color] || colorClasses.gray;
        return (
            <div className="p-4 bg-gray-800 rounded-lg">
                <div onClick={() => onStatusClick(specialStatus)} className="flex items-center gap-4 cursor-pointer">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${specialClasses.bg} text-white`}>
                        {React.cloneElement(specialStatus.icon, { className: 'h-7 w-7'})}
                    </div>
                    <div>
                        <h4 className={`font-bold text-lg ${specialClasses.text}`}>{specialStatus.title}</h4>
                        <p className="text-sm text-gray-400">Clique para ver mais detalhes</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* --- VISTA DESKTOP --- */}
            <div className="hidden md:flex justify-between items-center flex-wrap gap-2">
                {timelineOrder.map((statusKey, index) => {
                    const statusInfo = historyMap.get(statusKey);
                    const isStepActive = index <= currentStatusIndex;
                    const isCurrent = statusKey === currentStatus;
                    const definition = STATUS_DEFINITIONS[statusKey];
                    if (!definition) return null;
                    const currentClasses = isStepActive ? colorClasses[definition.color] : colorClasses.gray;
                    
                    return (
                        <React.Fragment key={statusKey}>
                            <div 
                                className={`flex flex-col items-center ${isStepActive && statusInfo ? 'cursor-pointer group' : 'cursor-default'}`} 
                                onClick={isStepActive && statusInfo ? () => onStatusClick(definition) : undefined}>
                                <div className={`relative w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${currentClasses.bg} ${currentClasses.border} ${isCurrent ? 'animate-pulse' : ''}`}>
                                    {React.cloneElement(definition.icon, { className: 'h-5 w-5 text-white' })}
                                </div>
                                <p className={`mt-2 text-xs text-center font-semibold transition-all ${currentClasses.text}`}>{definition.title}</p>
                                {statusInfo && isStepActive && (<p className="text-xs text-gray-500">{new Date(statusInfo.status_date).toLocaleDateString('pt-BR')}</p>)}
                            </div>
                            {index < timelineOrder.length - 1 && <div className={`flex-1 h-1 transition-colors ${isStepActive ? currentClasses.bg : colorClasses.gray.bg}`}></div>}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* --- VISTA MOBILE --- */}
            <div className="md:hidden flex flex-col">
                {timelineOrder.map((statusKey, index) => {
                    const statusInfo = historyMap.get(statusKey);
                    const isStepActive = index <= currentStatusIndex;
                    const isCurrent = statusKey === currentStatus;
                    const definition = STATUS_DEFINITIONS[statusKey];
                    if (!definition) return null;
                    const currentClasses = isStepActive ? colorClasses[definition.color] : colorClasses.gray;

                    return (
                        <div key={statusKey} className="flex">
                            <div className="flex flex-col items-center mr-4">
                                <div 
                                    className={`relative w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all ${currentClasses.bg} ${currentClasses.border} ${isCurrent ? 'animate-pulse' : ''} ${isStepActive && statusInfo ? 'cursor-pointer' : 'cursor-default'}`}
                                    onClick={isStepActive && statusInfo ? () => onStatusClick(definition) : undefined}>
                                    {React.cloneElement(definition.icon, { className: 'h-5 w-5 text-white' })}
                                </div>
                                {index < timelineOrder.length - 1 && <div className={`w-px flex-grow transition-colors my-1 ${index < currentStatusIndex ? currentClasses.bg : colorClasses.gray.bg}`}></div>}
                            </div>
                            <div 
                                className={`pt-1.5 pb-8 ${isStepActive && statusInfo ? 'cursor-pointer' : 'cursor-default'}`}
                                onClick={isStepActive && statusInfo ? () => onStatusClick(definition) : undefined}>
                                <p className={`font-semibold transition-all ${currentClasses.text}`}>{definition.title}</p>
                                {statusInfo && isStepActive && (<p className="text-xs text-gray-500">{new Date(statusInfo.status_date).toLocaleString('pt-BR')}</p>)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const PickupOrderStatusTimeline = ({ history, currentStatus, onStatusClick }) => {
    const STATUS_DEFINITIONS = useMemo(() => ({
        'Pendente': { title: 'Pedido Pendente', description: 'Aguardando a confirmação do pagamento.', icon: <ClockIcon className="h-6 w-6" />, color: 'amber' },
        'Pagamento Aprovado': { title: 'Pagamento Aprovado', description: 'Recebemos seu pagamento! Agora, estamos preparando seu pedido.', icon: <CheckBadgeIcon className="h-6 w-6" />, color: 'green' },
        'Pagamento Recusado': { title: 'Pagamento Recusado', description: 'A operadora não autorizou o pagamento. Por favor, tente novamente ou use outra forma de pagamento.', icon: <XCircleIcon className="h-6 w-6" />, color: 'red' },
        'Separando Pedido': { title: 'Separando Pedido', description: 'Seu pedido está sendo cuidadosamente separado e embalado.', icon: <PackageIcon className="h-6 w-6" />, color: 'blue' },
        'Pronto para Retirada': { title: 'Pronto para Retirada', description: 'Seu pedido está pronto! Você já pode vir retirá-lo em nosso endereço dentro do horário de funcionamento.', icon: <CheckCircleIcon className="h-6 w-6" />, color: 'blue' },
        'Entregue': { title: 'Pedido Retirado', description: 'Seu pedido foi retirado com sucesso! Esperamos que goste.', icon: <HomeIcon className="h-6 w-6" />, color: 'green' },
        'Cancelado': { title: 'Pedido Cancelado', description: 'Este pedido foi cancelado. Se tiver alguma dúvida, entre em contato conosco.', icon: <XCircleIcon className="h-6 w-6" />, color: 'red' },
        'Reembolsado': { title: 'Pedido Reembolsado', description: 'O valor deste pedido foi estornado.', icon: <CurrencyDollarIcon className="h-6 w-6" />, color: 'gray' }
    }), []);

    const colorClasses = useMemo(() => ({
        amber: { bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500' },
        green: { bg: 'bg-green-500', text: 'text-green-400', border: 'border-green-500' },
        blue:  { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500' },
        red:   { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500' },
        gray:  { bg: 'bg-gray-700', text: 'text-gray-500', border: 'border-gray-600' }
    }), []);
    
    const timelineOrder = useMemo(() => [
        'Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Pronto para Retirada', 'Entregue'
    ], []);

    // FILTRO DE SEGURANÇA: Garante que o histórico seja sempre uma lista válida de objetos com status.
    const historyMap = useMemo(() =>
        new Map(
            (Array.isArray(history) ? history : [])
                .filter(h => h && typeof h === 'object' && h.status)
                .map(h => [h.status, h])
        )
    , [history]);

    const currentStatusIndex = timelineOrder.indexOf(currentStatus);

    if (['Cancelado', 'Pagamento Recusado', 'Reembolsado'].includes(currentStatus)) {
        const specialStatus = STATUS_DEFINITIONS[currentStatus];
        if (!specialStatus) return <div className="p-4 bg-red-100 text-red-700 rounded-md">Status desconhecido: {currentStatus}</div>;
        
        const specialClasses = colorClasses[specialStatus.color] || colorClasses.gray;
        return (
            <div className="p-4 bg-gray-800 rounded-lg">
                <div onClick={() => onStatusClick(specialStatus)} className="flex items-center gap-4 cursor-pointer">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${specialClasses.bg} text-white`}>
                        {React.cloneElement(specialStatus.icon, { className: 'h-7 w-7'})}
                    </div>
                    <div>
                        <h4 className={`font-bold text-lg ${specialClasses.text}`}>{specialStatus.title}</h4>
                        <p className="text-sm text-gray-400">Clique para ver mais detalhes</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* --- VISTA DESKTOP --- */}
            <div className="hidden md:flex justify-between items-center flex-wrap gap-2">
                {timelineOrder.map((statusKey, index) => {
                    const statusInfo = historyMap.get(statusKey);
                    const isStepActive = index <= currentStatusIndex;
                    const isCurrent = statusKey === currentStatus;
                    const definition = STATUS_DEFINITIONS[statusKey];
                    if (!definition) return null;
                    const currentClasses = isStepActive ? colorClasses[definition.color] : colorClasses.gray;
                    
                    return (
                        <React.Fragment key={statusKey}>
                            <div 
                                className={`flex flex-col items-center ${isStepActive && statusInfo ? 'cursor-pointer group' : 'cursor-default'}`} 
                                onClick={isStepActive && statusInfo ? () => onStatusClick(definition) : undefined}>
                                <div className={`relative w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${currentClasses.bg} ${currentClasses.border} ${isCurrent ? 'animate-pulse' : ''}`}>
                                    {React.cloneElement(definition.icon, { className: 'h-5 w-5 text-white' })}
                                </div>
                                <p className={`mt-2 text-xs text-center font-semibold transition-all ${currentClasses.text}`}>{definition.title}</p>
                                {statusInfo && isStepActive && (<p className="text-xs text-gray-500">{new Date(statusInfo.status_date).toLocaleDateString('pt-BR')}</p>)}
                            </div>
                            {index < timelineOrder.length - 1 && <div className={`flex-1 h-1 transition-colors ${isStepActive ? currentClasses.bg : colorClasses.gray.bg}`}></div>}
                        </React.Fragment>
                    );
                })}
            </div>
            {/* --- VISTA MOBILE --- */}
            <div className="md:hidden flex flex-col">
                {timelineOrder.map((statusKey, index) => {
                    const statusInfo = historyMap.get(statusKey);
                    const isStepActive = index <= currentStatusIndex;
                    const isCurrent = statusKey === currentStatus;
                    const definition = STATUS_DEFINITIONS[statusKey];
                    if (!definition) return null;
                    const currentClasses = isStepActive ? colorClasses[definition.color] : colorClasses.gray;

                    return (
                        <div key={statusKey} className="flex">
                            <div className="flex flex-col items-center mr-4">
                                <div 
                                    className={`relative w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all ${currentClasses.bg} ${currentClasses.border} ${isCurrent ? 'animate-pulse' : ''} ${isStepActive && statusInfo ? 'cursor-pointer' : 'cursor-default'}`}
                                    onClick={isStepActive && statusInfo ? () => onStatusClick(definition) : undefined}>
                                    {React.cloneElement(definition.icon, { className: 'h-5 w-5 text-white' })}
                                </div>
                                {index < timelineOrder.length - 1 && <div className={`w-px flex-grow transition-colors my-1 ${index < currentStatusIndex ? currentClasses.bg : colorClasses.gray.bg}`}></div>}
                            </div>
                            <div 
                                className={`pt-1.5 pb-8 ${isStepActive && statusInfo ? 'cursor-pointer' : 'cursor-default'}`}
                                onClick={isStepActive && statusInfo ? () => onStatusClick(definition) : undefined}>
                                <p className={`font-semibold transition-all ${currentClasses.text}`}>{definition.title}</p>
                                {statusInfo && isStepActive && (<p className="text-xs text-gray-500">{new Date(statusInfo.status_date).toLocaleString('pt-BR')}</p>)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


const StatusDescriptionModal = ({ isOpen, onClose, details }) => {
    if (!isOpen || !details) return null;

    const colorMap = {
        amber: { bg: 'bg-amber-100', icon: 'text-amber-600', title: 'text-amber-800' },
        green: { bg: 'bg-green-100', icon: 'text-green-600', title: 'text-green-800' },
        blue:  { bg: 'bg-blue-100', icon: 'text-blue-600', title: 'text-blue-800' },
        red:   { bg: 'bg-red-100', icon: 'text-red-600', title: 'text-red-800' },
        gray:  { bg: 'bg-gray-100', icon: 'text-gray-600', title: 'text-gray-800' }
    };

    const theme = colorMap[details.color] || colorMap.gray;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Status">
             <div className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${theme.bg} ${theme.icon} mb-4`}>
                    {React.cloneElement(details.icon, { className: 'h-8 w-8' })}
                </div>
                <h3 className={`text-xl font-bold ${theme.title} mb-2`}>{details.title}</h3>
                <p className="text-gray-600">{details.description}</p>
            </div>
        </Modal>
    );
};

const ProductReviewForm = ({ productId, orderId, onReviewSubmitted }) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const notification = useNotification();
    const MAX_COMMENT_LENGTH = 500;

    const handleCommentChange = (e) => {
        setComment(e.target.value.slice(0, MAX_COMMENT_LENGTH));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            notification.show("Por favor, selecione uma nota clicando nas estrelas.", 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            await apiService(`/reviews`, 'POST', {
                product_id: productId,
                order_id: orderId,
                rating: rating,
                comment: comment,
            });
            notification.show("Avaliação enviada com sucesso!");
            if (onReviewSubmitted) {
                onReviewSubmitted();
            }
        } catch (error) {
            notification.show(error.message || "Não foi possível enviar sua avaliação.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 text-gray-800">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sua Nota</label>
                <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                        <StarIcon key={i} onClick={() => setRating(i + 1)} className={`h-8 w-8 cursor-pointer ${i < rating ? 'text-amber-400' : 'text-gray-400 hover:text-amber-300'}`} isFilled={i < rating} />
                    ))}
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seu Comentário (opcional)</label>
                <textarea 
                    value={comment} 
                    onChange={handleCommentChange} 
                    placeholder="Conte o que você achou do produto..." 
                    className="w-full p-2 border border-gray-300 rounded-md h-24 bg-white"
                    maxLength={MAX_COMMENT_LENGTH}
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                    {comment.length} / {MAX_COMMENT_LENGTH}
                </div>
            </div>
            <div className="flex justify-end pt-4">
                <button type="submit" disabled={isSubmitting} className="bg-gray-800 text-white font-bold py-2 px-6 rounded-md hover:bg-gray-900 disabled:bg-gray-400 flex items-center justify-center">
                    {isSubmitting ? <SpinnerIcon /> : "Enviar Avaliação"}
                </button>
            </div>
        </form>
    );
};

const OrderDetailPage = ({ onNavigate, orderId }) => {
    const { addToCart } = useShop();
    const notification = useNotification();
    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPaying, setIsPaying] = useState(false);
    const [isItemsExpanded, setIsItemsExpanded] = useState(true);
    
    const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [selectedStatusDetails, setSelectedStatusDetails] = useState(null);
    
    const [reviewingItem, setReviewingItem] = useState(null);
    
    // --- Estados para o Modal de Reembolso/Cancelamento do Cliente ---
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [refundReason, setRefundReason] = useState('');
    const [isProcessingRefund, setIsProcessingRefund] = useState(false);

    const fetchOrderDetails = useCallback(() => {
        setIsLoading(true);
        return apiService(`/orders/my-orders?id=${orderId}`)
            .then(data => {
                if (data && data.length > 0) {
                    setOrder(data[0]);
                } else {
                    throw new Error("Pedido não encontrado.");
                }
            })
            .catch(err => notification.show(err.message, 'error'))
            .finally(() => setIsLoading(false));
    }, [orderId, notification]);

    useEffect(() => {
        fetchOrderDetails();
    }, [fetchOrderDetails]);

    const handleReviewSuccess = () => {
        setReviewingItem(null);
        fetchOrderDetails();
    };

    const handleOpenStatusModal = (statusDetails) => {
        setSelectedStatusDetails(statusDetails);
        setIsStatusModalOpen(true);
    };

    const handleRetryPayment = async (orderId) => {
        setIsPaying(true);
        try {
            const paymentResult = await apiService('/create-mercadopago-payment', 'POST', { orderId });
            if (paymentResult && paymentResult.init_point) {
                sessionStorage.setItem('pendingOrderId', orderId);
                window.location.href = paymentResult.init_point;
            } else { throw new Error("Não foi possível obter o link de pagamento."); }
        } catch (error) {
            notification.show(`Erro ao tentar realizar o pagamento: ${error.message}`, 'error');
        } finally {
            setIsPaying(false);
        }
    };

    const handleRepeatOrder = (orderItems) => {
        if (!orderItems) return;
        
        const promises = (Array.isArray(orderItems) ? orderItems : []).map(item => {
            if (item.product_type === 'clothing') {
                notification.show(`Para adicionar "${item.name}" novamente, por favor, visite a página do produto.`, 'error');
                return Promise.resolve(0);
            }
            const product = { id: item.product_id, name: item.name, price: item.price, images: item.images, stock: item.stock, variations: item.variations, is_on_sale: item.is_on_sale, sale_price: item.sale_price };
            return addToCart(product, item.quantity, item.variation)
                .then(() => 1) 
                .catch(err => {
                    notification.show(`Não foi possível adicionar "${item.name}": ${err.message}`, 'error');
                    return 0; 
                });
        });

        Promise.all(promises).then(results => {
            const count = results.reduce((sum, val) => sum + val, 0);
            if (count > 0) {
                notification.show(`${count} item(ns) adicionado(s) ao carrinho!`);
                onNavigate('cart');
            }
        });
    };
    
    const handleRequestRefund = async (e) => {
        e.preventDefault();
        setIsProcessingRefund(true);
        try {
            const result = await apiService('/refunds/request', 'POST', {
                order_id: order.id,
                reason: refundReason
            });
            notification.show(result.message);
            setIsRefundModalOpen(false);
            setRefundReason('');
            fetchOrderDetails(); // Recarrega os dados do pedido
        } catch (error) {
            notification.show(`Erro ao solicitar: ${error.message}`, 'error');
        } finally {
            setIsProcessingRefund(false);
        }
    };

    const getCardIcon = (brand) => {
        const lowerBrand = brand ? brand.toLowerCase() : '';
        switch (lowerBrand) {
            case 'visa': return VisaIcon;
            case 'master':
            case 'mastercard': return MastercardIcon;
            case 'elo': return EloIcon;
            default: return CreditCardIcon;
        }
    };
    
    const getRefundStatusInfo = (status) => {
        const statuses = {
            'pending_approval': { text: 'Cancelamento em análise', class: 'text-yellow-400 bg-yellow-900/50', icon: <ClockIcon className="h-4 w-4"/> },
            'processed': { text: 'Reembolso Concluído', class: 'text-green-400 bg-green-900/50', icon: <CheckCircleIcon className="h-4 w-4"/> },
            'denied': { text: 'Solicitação Negada', class: 'text-red-400 bg-red-900/50', icon: <XCircleIcon className="h-4 w-4"/> },
            'failed': { text: 'Falha no Reembolso', class: 'text-red-400 bg-red-900/50', icon: <ExclamationCircleIcon className="h-4 w-4"/> }
        };
        // Ajuste para pedidos entregues
        if (order.status === 'Entregue' && status === 'pending_approval') {
            statuses['pending_approval'].text = 'Reembolso em análise';
        }
        return statuses[status] || { text: `Status: ${status}`, class: 'text-gray-400 bg-gray-700', icon: null };
    };

    const renderPaymentDetails = () => {
        if (!order || !order.payment_method) {
            return <p className="text-sm text-gray-400">Informação de pagamento não disponível.</p>;
        }

        const paymentDetails = order.payment_details ? JSON.parse(order.payment_details) : null;

        if (paymentDetails) {
            if (paymentDetails.method === 'pix') {
                return (
                    <div className="flex items-center gap-3">
                        <PixIcon className="h-7 w-7 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-white">Pagamento via Pix</p>
                            <p className="text-sm text-gray-400">Confirmado via Mercado Pago.</p>
                        </div>
                    </div>
                );
            }
            if (paymentDetails.method === 'credit_card' && paymentDetails.card_last_four) {
                const CardIconComponent = getCardIcon(paymentDetails.card_brand);
                return (
                     <div className="flex items-center gap-3">
                        <CardIconComponent className="h-8 w-8 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-white capitalize">{paymentDetails.card_brand || 'Cartão de Crédito'} final {paymentDetails.card_last_four}</p>
                            <p className="text-sm text-gray-400">
                                {paymentDetails.installments > 1 
                                    ? `Pagamento em ${paymentDetails.installments}x de R$ ${(Number(order.total) / paymentDetails.installments).toFixed(2).replace('.', ',')}`
                                    : 'Pagamento em 1x (à vista)'
                                }
                            </p>
                        </div>
                    </div>
                );
            }
            if (paymentDetails.method === 'boleto') {
                return (
                    <div className="flex items-center gap-3">
                        <BoletoIcon className="h-7 w-7 text-gray-300 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-white">Boleto Bancário</p>
                            <p className="text-sm text-gray-400">Confirmado via Mercado Pago.</p>
                        </div>
                    </div>
                );
            }
        }

        // Fallback
        return (
            <div className="flex items-center gap-3">
                <CreditCardIcon className="h-7 w-7 text-gray-300 flex-shrink-0" />
                <div>
                    <p className="font-semibold text-white">Pagamento via Mercado Pago</p>
                    <p className="text-sm text-gray-400 capitalize">{paymentDetails?.method || 'Detalhes não disponíveis'}</p>
                </div>
            </div>
        );
    };

    if (isLoading) return <div className="flex justify-center items-center py-20"><SpinnerIcon className="h-8 w-8 text-amber-400 animate-spin"/></div>;
    if (!order) return <p className="text-center text-gray-400 py-20">Pedido não encontrado.</p>;

    const isPickupOrder = order.shipping_method === 'Retirar na loja';
    const pickupDetails = isPickupOrder && order.pickup_details ? JSON.parse(order.pickup_details) : null;
    const safeHistory = Array.isArray(order.history) ? order.history : [];
    const shippingAddress = !isPickupOrder && order.shipping_address ? JSON.parse(order.shipping_address) : null;
    const subtotal = (Number(order.total) || 0) - (Number(order.shipping_cost) || 0) + (Number(order.discount_amount) || 0);
    
    const cancellableStatuses = ['Pagamento Aprovado', 'Separando Pedido', 'Entregue'];
    const isOrderDelivered = order.status === 'Entregue';
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const isWithinRefundPeriod = new Date(order.date) > thirtyDaysAgo;
    
    // A condição agora verifica o status do pagamento do gateway
    const canRequest = 
        order.payment_status === 'approved' && // <-- VERIFICAÇÃO ADICIONADA
        cancellableStatuses.includes(order.status) && 
        !order.refund_id && 
        (order.status !== 'Entregue' || isWithinRefundPeriod);
    const actionText = isOrderDelivered ? 'Reembolso' : 'Cancelamento';
    
    const refundInfo = order.refund_id ? getRefundStatusInfo(order.refund_status) : null;

    return (
        <>
            <TrackingModal isOpen={isTrackingModalOpen} onClose={() => setIsTrackingModalOpen(false)} order={order} />
            <StatusDescriptionModal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} details={selectedStatusDetails} />
            <AnimatePresence>
                {reviewingItem && (
                    <Modal isOpen={true} onClose={() => setReviewingItem(null)} title={`Avaliar: ${reviewingItem.name}`}>
                        <ProductReviewForm 
                            productId={reviewingItem.product_id}
                            orderId={order.id}
                            onReviewSubmitted={handleReviewSuccess}
                        />
                    </Modal>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {isRefundModalOpen && (
                    <Modal isOpen={true} onClose={() => setIsRefundModalOpen(false)} title={`Solicitar ${actionText} do Pedido #${order.id}`}>
                        <form onSubmit={handleRequestRefund} className="space-y-4 text-gray-800">
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Motivo da Solicitação de {actionText}</label>
                                <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} required rows="4" placeholder="Ex: Produto veio com defeito, desisti da compra, etc." className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white"></textarea>
                            </div>
                            <div className="bg-gray-100 p-3 rounded-md text-sm">
                                <p><strong>Valor a ser reembolsado:</strong> R$ {Number(order.total).toFixed(2)}</p>
                                <p className="text-xs text-gray-500 mt-1">O valor será estornado no mesmo método de pagamento da compra após a aprovação da solicitação.</p>
                            </div>
                             <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setIsRefundModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
                                <button type="submit" disabled={isProcessingRefund} className="px-4 py-2 bg-amber-600 text-white rounded-md flex items-center gap-2 disabled:bg-amber-300">
                                    {isProcessingRefund && <SpinnerIcon className="h-5 w-5" />}
                                    Enviar Solicitação
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>
            <div>
                <button onClick={() => onNavigate('account/orders')} className="text-sm text-amber-400 hover:underline flex items-center mb-6 w-fit">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Voltar para todos os pedidos
                </button>
                <div className="border border-gray-800 rounded-lg p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-2">
                        <div>
                            <p className="text-2xl font-bold">Detalhes do Pedido <span className="text-amber-400">#{order.id}</span></p>
                            <p className="text-sm text-gray-400">{new Date(order.date).toLocaleString('pt-BR')}</p>
                        </div>
                    </div>

                    {order.status === 'Pendente' && (
                        <div className="my-4 p-4 bg-amber-900/50 border border-amber-700 rounded-lg text-center">
                            <p className="font-semibold text-amber-300 mb-3">Este pedido está aguardando pagamento.</p>
                            <button onClick={() => handleRetryPayment(order.id)} disabled={isPaying} className="bg-amber-400 text-black font-bold px-8 py-2 rounded-md hover:bg-amber-300 transition-all disabled:opacity-50 disabled:cursor-wait flex items-center justify-center mx-auto">
                                {isPaying ? <SpinnerIcon className="h-5 w-5" /> : 'Pagar Agora'}
                            </button>
                        </div>
                    )}

                    <div className="my-6">
                        {isPickupOrder ? 
                            <PickupOrderStatusTimeline history={safeHistory} currentStatus={order.status} onStatusClick={handleOpenStatusModal} /> 
                            : 
                            <OrderStatusTimeline history={safeHistory} currentStatus={order.status} onStatusClick={handleOpenStatusModal} />
                        }
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                        <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="font-bold text-gray-200 mb-3">Resumo Financeiro</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-gray-300">
                                    <span>Subtotal dos produtos</span>
                                    <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                                </div>
                                <div className="flex justify-between text-gray-300">
                                    <span>Frete</span>
                                    <span>R$ {Number(order.shipping_cost).toFixed(2).replace('.', ',')}</span>
                                </div>
                                {Number(order.discount_amount) > 0 && (
                                    <div className="flex justify-between text-green-400">
                                        <span>Desconto ({order.coupon_code || 'Cupom'})</span>
                                        <span>- R$ {Number(order.discount_amount).toFixed(2).replace('.', ',')}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-white font-bold text-base border-t border-gray-700 pt-2 mt-2">
                                    <span>Total</span>
                                    <span className="text-amber-400">R$ {Number(order.total).toFixed(2).replace('.', ',')}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="font-bold text-gray-200 mb-2">Forma de Pagamento</h3>
                            {renderPaymentDetails()}
                        </div>
                    </div>

                    {isPickupOrder ? (
                        <div className="my-4 p-3 bg-gray-800 rounded-md text-sm space-y-2">
                            <p><strong>Informações para Retirada:</strong></p>
                            <p><strong>Endereço:</strong> R. Leopoldo Pereira Lima, 378 – Mangabeira VIII, João Pessoa – PB</p>
                            <p><strong>Horário:</strong> Seg a Sáb, 09h-11h30 e 15h-17h30</p>
                            {pickupDetails?.personName && <p><strong>Pessoa autorizada:</strong> {pickupDetails.personName}</p>}
                            <p className="text-amber-300 text-xs mt-2">Apresente um documento com foto e o número do pedido no momento da retirada.</p>
                        </div>
                    ) : (
                        <div className="my-4 p-3 bg-gray-800 rounded-md text-sm space-y-2">
                            <p className="font-bold text-base mb-2">Endereço de Entrega:</p>
                            {shippingAddress ? (
                                <div className="space-y-1">
                                    <p><span className="font-semibold text-gray-400">Rua:</span> {shippingAddress.logradouro}</p>
                                    <p><span className="font-semibold text-gray-400">Nº:</span> {shippingAddress.numero} {shippingAddress.complemento && `- ${shippingAddress.complemento}`}</p>
                                    <p><span className="font-semibold text-gray-400">Bairro:</span> {shippingAddress.bairro}</p>
                                    <p><span className="font-semibold text-gray-400">Cidade:</span> {shippingAddress.localidade} - {shippingAddress.uf}</p>
                                    <p><span className="font-semibold text-gray-400">CEP:</span> {shippingAddress.cep}</p>
                                </div>
                            ) : <p>Endereço não informado.</p>}
                            {order.tracking_code && <p className="mt-2 pt-2 border-t border-gray-700"><strong>Cód. Rastreio:</strong> {order.tracking_code}</p>}
                        </div>
                    )}

                    <div className="border-t border-gray-800 pt-4">
                        <button onClick={() => setIsItemsExpanded(!isItemsExpanded)} className="flex justify-between items-center w-full mb-2 text-left">
                            <h4 className="font-bold text-lg text-gray-200">Itens do Pedido ({(order.items || []).length})</h4>
                            <ChevronDownIcon className={`h-6 w-6 text-gray-400 transition-transform ${isItemsExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {isItemsExpanded && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="space-y-3 pt-2">
                                        {(order.items || []).map(item => (
                                            <div key={`${item.product_id}-${item.variation?.id || 'base'}`} className="bg-gray-800 p-3 rounded-md">
                                                <div className="flex items-center text-sm">
                                                    <div onClick={() => onNavigate(`product/${item.product_id}`)} className="cursor-pointer flex-shrink-0">
                                                        <img src={getFirstImage(item.images)} alt={item.name} className="h-16 w-16 object-contain mr-4 bg-white rounded"/>
                                                    </div>
                                                    <div className="flex-grow">
                                                        <p className="font-semibold text-white cursor-pointer hover:text-amber-400" onClick={() => onNavigate(`product/${item.product_id}`)}>{item.quantity}x {item.name}</p>
                                                        {item.variation && <span className="text-xs block text-gray-400">{item.variation.color} / {item.variation.size}</span>}
                                                        <p className="text-gray-300 mt-1">R$ {Number(item.price).toFixed(2)}</p>
                                                    </div>
                                                </div>
                                                {order.status === 'Entregue' && (
                                                    <div className="mt-3 pt-3 border-t border-gray-700 text-right">
                                                        {item.is_reviewed ? (
                                                            <div className="flex items-center justify-end gap-2 text-sm text-green-400">
                                                                <CheckCircleIcon className="h-5 w-5" />
                                                                <span>Você já avaliou este produto.</span>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => setReviewingItem(item)}
                                                                className="bg-amber-500 text-black text-xs font-bold px-4 py-1.5 rounded-md hover:bg-amber-400 transition"
                                                            >
                                                                Avaliar Produto
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="pt-4 mt-4 border-t border-gray-800 space-y-4 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <button onClick={() => handleRepeatOrder(order.items)} className="bg-gray-700 text-white text-sm px-4 py-1.5 rounded-md hover:bg-gray-600">Repetir Pedido</button>
                            {isPickupOrder ? (
                                <button onClick={() => setIsTrackingModalOpen(true)} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-md hover:bg-blue-700">Ver Status da Retirada</button>
                            ) : (
                                order.tracking_code && <button onClick={() => setIsTrackingModalOpen(true)} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-md hover:bg-blue-700">Rastrear Pedido</button>
                            )}
                             {canRequest && (
                                <button onClick={() => setIsRefundModalOpen(true)} className="bg-amber-600 text-white text-sm px-4 py-1.5 rounded-md hover:bg-amber-700">Solicitar {actionText}</button>
                            )}
                            {refundInfo && (
                                <div className={`flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-md ${refundInfo.class}`}>
                                    {refundInfo.icon}
                                    <span>{refundInfo.text}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-end gap-2 text-xs text-gray-400">
                            <span>Dúvidas?</span>
                            <a href={`https://wa.me/5583987379573?text=Olá,%20gostaria%20de%20falar%20sobre%20meu%20pedido%20%23${order.id}`} target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 transition-colors" title="Contato via WhatsApp"><WhatsappIcon className="h-4 w-4" /></a>
                            <a href="https://www.instagram.com/lovecestaseperfumesjp/" target="_blank" rel="noopener noreferrer" className="bg-pink-500 text-white p-2 rounded-full hover:bg-pink-600 transition-colors" title="Contato via Instagram"><InstagramIcon className="h-4 w-4" /></a>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

const MyOrdersListPage = ({ onNavigate }) => {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const notification = useNotification();
    const [orderToReview, setOrderToReview] = useState(null);
    const [itemToReview, setItemToReview] = useState(null);

    const fetchOrders = useCallback(() => {
        return apiService('/orders/my-orders')
            .then(data => setOrders(data.sort((a, b) => new Date(b.date) - new Date(a.date))))
            .catch(err => {
                console.error("Falha ao buscar pedidos:", err);
                if (!window.ordersErrorShown) {
                    notification.show("Falha ao buscar pedidos.", 'error');
                    window.ordersErrorShown = true;
                    setTimeout(() => { window.ordersErrorShown = false; }, 5000);
                }
            });
    }, [notification]);

    useEffect(() => {
        setIsLoading(true);
        fetchOrders().finally(() => {
            setIsLoading(false);
        });
    }, [fetchOrders]);

    const handleReviewSuccess = async () => {
        try {
            const newOrders = await apiService('/orders/my-orders');
            const sortedOrders = newOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            setOrders(sortedOrders);
            setItemToReview(null);
            setOrderToReview(null);
        } catch (err) {
            console.error("Falha ao recarregar pedidos após avaliação:", err);
            notification.show("Não foi possível atualizar a lista de pedidos.", 'error');
            setItemToReview(null);
            setOrderToReview(null);
        }
    };

    const getStatusChipClass = (status) => {
        const lowerStatus = status.toLowerCase();
        if (lowerStatus.includes('entregue')) return 'bg-green-200 text-green-800';
        if (lowerStatus.includes('cancelado') || lowerStatus.includes('recusado')) return 'bg-red-200 text-red-800';
        if (lowerStatus.includes('pendente')) return 'bg-yellow-200 text-yellow-800';
        return 'bg-blue-200 text-blue-800';
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-amber-400 mb-6">Meus Pedidos</h2>

            <AnimatePresence>
                {orderToReview && (
                    <Modal isOpen={true} onClose={() => setOrderToReview(null)} title={`Avaliar Itens do Pedido #${orderToReview.id}`}>
                        <div className="space-y-3">
                            {(orderToReview.items || []).map(item => (
                                <div key={item.id} className="flex items-center justify-between gap-4 p-2 bg-gray-100 rounded-md">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <img src={getFirstImage(item.images)} alt={item.name} className="w-12 h-12 object-contain bg-white rounded-md flex-shrink-0"/>
                                        <p className="font-semibold text-gray-800 truncate">{item.name}</p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        {!item.is_reviewed ? (
                                            <button onClick={() => setItemToReview(item)} className="bg-amber-500 text-black text-xs font-bold px-3 py-1.5 rounded-md hover:bg-amber-400 transition">Avaliar</button>
                                        ) : (
                                            <span className="text-xs text-green-600 font-semibold flex items-center gap-1"><CheckIcon className="h-4 w-4"/> Avaliado</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Modal>
                )}
            </AnimatePresence>
            
            <AnimatePresence>
                {itemToReview && (
                    <Modal isOpen={true} onClose={() => { setItemToReview(null); setOrderToReview(null); }} title={`Deixe sua opinião sobre: ${itemToReview.name}`}>
                        <ProductReviewForm 
                            productId={itemToReview.product_id}
                            orderId={orderToReview.id}
                            onReviewSubmitted={handleReviewSuccess}
                        />
                    </Modal>
                )}
            </AnimatePresence>

            {isLoading ? (
                <div className="flex justify-center items-center py-20"><SpinnerIcon className="h-8 w-8 text-amber-400 animate-spin" /></div>
            ) : orders.length > 0 ? (
                <div className="space-y-4">
                    {orders.map(order => {
                        const firstItem = order.items && order.items.length > 0 ? order.items[0] : null;
                        const canReviewOrder = order.status === 'Entregue' && order.items?.some(item => !item.is_reviewed);

                        return (
                            <motion.div
                                key={order.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * orders.indexOf(order) }}
                                className="bg-gray-800 p-4 rounded-lg border border-gray-700"
                            >
                                {firstItem && (
                                    <div className="flex items-center gap-4 border-b border-gray-700 pb-4 mb-4">
                                        <div onClick={() => onNavigate(`product/${firstItem.product_id}`)} className="cursor-pointer flex-shrink-0">
                                            <img src={getFirstImage(firstItem.images)} alt={firstItem.name} className="w-16 h-16 object-contain bg-white rounded-md"/>
                                        </div>
                                        <div className="flex-grow overflow-hidden">
                                            <p onClick={() => onNavigate(`product/${firstItem.product_id}`)} className="font-semibold text-white truncate cursor-pointer hover:text-amber-400 transition-colors">
                                                {firstItem.name}
                                            </p>
                                            {order.items.length > 1 && ( <p className="text-sm text-gray-400 mt-1">+ {order.items.length - 1} outro(s) item(ns)</p> )}
                                        </div>
                                    </div>
                                )}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left">
                                        <div><p className="text-xs text-gray-400">Pedido</p><p className="font-bold text-white">#{order.id}</p></div>
                                        <div><p className="text-xs text-gray-400">Data</p><p className="font-semibold text-gray-300">{new Date(order.date).toLocaleDateString('pt-BR')}</p></div>
                                        <div><p className="text-xs text-gray-400">Status</p><span className={`px-2 py-1 text-xs font-semibold rounded-full inline-block ${getStatusChipClass(order.status)}`}>{order.status}</span></div>
                                        <div><p className="text-xs text-gray-400">Total</p><p className="font-bold text-amber-400">R$ {Number(order.total).toFixed(2)}</p></div>
                                    </div>
                                    <div className="flex-shrink-0 w-full sm:w-auto flex flex-col items-stretch gap-2">
                                        <button onClick={() => onNavigate(`account/orders/${order.id}`)} className="w-full bg-gray-700 text-white font-bold px-4 py-2 rounded-md hover:bg-gray-600 transition">Ver Detalhes</button>
                                        {canReviewOrder && (
                                             <button onClick={() => setOrderToReview(order)} className="w-full bg-amber-600 text-white font-bold px-4 py-2 rounded-md hover:bg-amber-700 transition">Avaliar Pedido</button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : ( <EmptyState icon={<PackageIcon className="h-12 w-12" />} title="Nenhum pedido encontrado" message="Você ainda não fez nenhuma compra." buttonText="Ver Produtos" onButtonClick={() => onNavigate('products')}/> )}
        </div>
    );
};
const MyAccountPage = ({ onNavigate, path }) => {
    const { user, logout } = useAuth();
    
    // A lógica agora extrai a aba principal e o ID do detalhe
    const pathParts = (path || 'orders').split('/');
    const activeTab = pathParts[0];
    const detailId = pathParts[1];

    const handleNavigation = (tab) => {
        onNavigate(`account/${tab}`);
    };

    const tabs = [
        { key: 'orders', label: 'Meus Pedidos', icon: <PackageIcon className="h-5 w-5"/> },
        { key: 'addresses', label: 'Meus Endereços', icon: <MapPinIcon className="h-5 w-5"/> },
        { key: 'profile', label: 'Meus Dados', icon: <UserIcon className="h-5 w-5"/> },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'addresses':
                return <MyAddressesSection />;
            case 'profile':
                return <MyProfileSection user={user} />;
            case 'orders':
            default:
                // Se houver um ID na URL, mostra a página de detalhes
                if (detailId && !isNaN(detailId)) {
                    return <OrderDetailPage orderId={detailId} onNavigate={onNavigate} />;
                }
                // Senão, mostra a lista de pedidos
                return <MyOrdersListPage onNavigate={onNavigate} />;
        }
    };

    return (
        <div className="bg-black text-white min-h-screen py-8 sm:py-12">
            <div className="container mx-auto px-4">
                {/* Oculta o título principal na página de detalhes para evitar repetição */}
                {!detailId && <h1 className="text-3xl md:text-4xl font-bold mb-8">Minha Conta</h1>}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <aside className="lg:col-span-1">
                        <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 space-y-2">
                            {tabs.map(tab => (
                                <button key={tab.key} onClick={() => handleNavigation(tab.key)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-md text-left transition-colors ${activeTab === tab.key ? 'bg-amber-500 text-black font-bold' : 'hover:bg-gray-800'}`}>
                                    {tab.icon}
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                            <button onClick={() => { logout(); onNavigate('home'); }} className="w-full flex items-center space-x-3 px-4 py-3 rounded-md text-left transition-colors hover:bg-gray-800">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                <span>Sair</span>
                            </button>
                        </div>
                    </aside>
                    <main className="lg:col-span-3">
                        <div className="bg-gray-900 p-4 sm:p-6 rounded-lg border border-gray-800">
                            {renderContent()}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

const EmptyState = ({ icon, title, message, buttonText, onButtonClick }) => (
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


const MyOrdersSection = ({ onNavigate }) => {
    const { addToCart } = useShop();
    const notification = useNotification();
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [orderForTracking, setOrderForTracking] = useState(null);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [selectedStatusDetails, setSelectedStatusDetails] = useState(null);
    const [isPaying, setIsPaying] = useState(null); // Estado para o botão "Pagar Agora"

    useEffect(() => {
        apiService('/orders/my-orders')
            .then(data => setOrders(data))
            .catch(err => notification.show("Falha ao buscar pedidos.", 'error'))
            .finally(() => setIsLoading(false));
    }, [notification]);

    const handleRetryPayment = async (orderId) => {
        setIsPaying(orderId);
        try {
            const paymentResult = await apiService('/create-mercadopago-payment', 'POST', { orderId });
            if (paymentResult && paymentResult.init_point) {
                window.location.href = paymentResult.init_point;
            } else {
                throw new Error("Não foi possível obter o link de pagamento.");
            }
        } catch (error) {
            notification.show(`Erro ao tentar realizar o pagamento: ${error.message}`, 'error');
        } finally {
            setIsPaying(null);
        }
    };

    const handleRepeatOrder = (orderItems) => {
        if (!orderItems) return;
        
        const promises = (Array.isArray(orderItems) ? orderItems : []).map(item => {
            if (item.product_type === 'clothing') {
                notification.show(`Para adicionar "${item.name}" novamente, por favor, visite a página do produto para selecionar cor e tamanho.`, 'error');
                return Promise.resolve(0);
            }
            const product = { id: item.product_id, name: item.name, price: item.price, images: item.images, stock: item.stock, variations: item.variations, is_on_sale: item.is_on_sale, sale_price: item.sale_price };
            return addToCart(product, item.quantity, item.variation)
                .then(() => 1) 
                .catch(err => {
                    notification.show(`Não foi possível adicionar "${item.name}": ${err.message}`, 'error');
                    return 0; 
                });
        });

        Promise.all(promises).then(results => {
            const count = results.reduce((sum, val) => sum + val, 0);
            if (count > 0) {
                notification.show(`${count} item(ns) adicionado(s) ao carrinho!`);
                onNavigate('cart');
            }
        });
    };

    const handleOpenStatusModal = (statusDetails) => {
        setSelectedStatusDetails(statusDetails);
        setIsStatusModalOpen(true);
    };
    
    if (isLoading) return <div className="flex justify-center items-center py-20"><SpinnerIcon className="h-8 w-8 text-amber-400"/></div>;

    return (
        <>
            <TrackingModal isOpen={!!orderForTracking} onClose={() => setOrderForTracking(null)} order={orderForTracking} />
            <StatusDescriptionModal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} details={selectedStatusDetails} />
            <h2 className="text-2xl font-bold text-amber-400 mb-6">Meus Pedidos</h2>
            {orders.length > 0 ? (
                <div className="space-y-6">
                    {orders.map(order => {
                        const isPickupOrder = order.shipping_method === 'Retirar na loja';
                        let pickupDetails = null;
                        if (isPickupOrder && typeof order.pickup_details === 'string') {
                            try {
                                pickupDetails = JSON.parse(order.pickup_details);
                            } catch (e) {
                                console.error("Erro ao parsear detalhes da retirada:", e);
                                pickupDetails = {};
                            }
                        }

                        const safeHistory = Array.isArray(order.history) ? order.history : [];
                        const orderDate = new Date(order.date);
                        const formattedDate = !isNaN(orderDate) ? orderDate.toLocaleString('pt-BR') : 'Data indisponível';

                        return (
                            <div key={order.id} className="border border-gray-800 rounded-lg p-4 sm:p-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-2">
                                    <div>
                                        <p className="text-lg">Pedido <span className="font-bold text-amber-400">#{order.id}</span></p>
                                        <p className="text-sm text-gray-400">{formattedDate}</p>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <p><strong>Total:</strong> <span className="text-amber-400 font-bold text-lg">R$ {Number(order.total).toFixed(2)}</span></p>
                                    </div>
                                </div>

                                {order.status === 'Pendente' && (
                                    <div className="my-4 p-4 bg-amber-900/50 border border-amber-700 rounded-lg text-center">
                                        <p className="font-semibold text-amber-300 mb-3">Este pedido está aguardando pagamento.</p>
                                        <button
                                            onClick={() => handleRetryPayment(order.id)}
                                            disabled={isPaying === order.id}
                                            className="bg-amber-400 text-black font-bold px-8 py-2 rounded-md hover:bg-amber-300 transition-all disabled:opacity-50 disabled:cursor-wait flex items-center justify-center mx-auto"
                                        >
                                            {isPaying === order.id ? <SpinnerIcon className="h-5 w-5" /> : 'Pagar Agora'}
                                        </button>
                                    </div>
                                )}

                                <div className="my-6">
                                    {isPickupOrder ? (
                                        <PickupOrderStatusTimeline history={safeHistory} currentStatus={order.status} onStatusClick={handleOpenStatusModal} />
                                    ) : (
                                        <OrderStatusTimeline history={safeHistory} currentStatus={order.status} onStatusClick={handleOpenStatusModal} />
                                    )}
                                </div>
                                
                                {isPickupOrder ? (
                                    <div className="my-4 p-3 bg-gray-800 rounded-md text-sm space-y-2">
                                        <p><strong>Informações para Retirada:</strong></p>
                                        <p><strong>Endereço:</strong> R. Leopoldo Pereira Lima, 378 – Mangabeira VIII, João Pessoa – PB</p>
                                        <p><strong>Horário:</strong> Seg a Sáb, 09h-11h30 e 15h-17h30</p>
                                        {pickupDetails?.personName && <p><strong>Pessoa autorizada:</strong> {pickupDetails.personName}</p>}
                                        <p className="text-amber-300 text-xs mt-2">Apresente um documento com foto e o número do pedido no momento da retirada.</p>
                                    </div>
                                ) : (
                                     order.tracking_code && <p className="my-4 p-3 bg-gray-800 rounded-md text-sm"><strong>Cód. Rastreio:</strong> {order.tracking_code}</p>
                                )}

                                <div className="space-y-2 mb-4 border-t border-gray-800 pt-4">
                                    {(Array.isArray(order.items) ? order.items : []).map(item => (
                                        <div key={item.id} className="flex items-center text-sm">
                                            <img src={getFirstImage(item.images)} alt={item.name} className="h-10 w-10 object-contain mr-3 bg-white rounded"/>
                                            <div className="flex-grow">
                                                <span>{item.quantity}x {item.name}</span>
                                                {item.variation && <span className="text-xs block text-gray-400">{item.variation.color} / {item.variation.size}</span>}
                                            </div>
                                            <span className="ml-auto">R$ {Number(item.price).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-4 border-t border-gray-800 space-y-4 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button onClick={() => handleRepeatOrder(order.items)} className="bg-gray-700 text-white text-sm px-4 py-1.5 rounded-md hover:bg-gray-600">Repetir Pedido</button>
                                        {isPickupOrder ? (
                                            <button onClick={() => setOrderForTracking(order)} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-md hover:bg-blue-700">Ver Status da Retirada</button>
                                        ) : (
                                            order.tracking_code && <button onClick={() => setOrderForTracking(order)} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-md hover:bg-blue-700">Rastrear Pedido</button>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-end gap-2 text-xs text-gray-400">
                                        <span>Dúvidas?</span>
                                        <a href={`https://wa.me/5583987379573?text=Olá,%20gostaria%20de%20falar%20sobre%20meu%20pedido%20%23${order.id}`} target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 transition-colors" title="Contato via WhatsApp">
                                            <WhatsappIcon className="h-4 w-4" />
                                        </a>
                                        <a href="https://www.instagram.com/lovecestaseperfumesjp/" target="_blank" rel="noopener noreferrer" className="bg-pink-500 text-white p-2 rounded-full hover:bg-pink-600 transition-colors" title="Contato via Instagram">
                                            <InstagramIcon className="h-4 w-4" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                 <EmptyState 
                    icon={<PackageIcon className="h-12 w-12"/>}
                    title="Nenhum pedido encontrado"
                    message="Você ainda não fez nenhuma compra. Explore nossos produtos!"
                    buttonText="Ver Produtos"
                    onButtonClick={() => onNavigate('products')}
                />
            )}
        </>
    );
};

const MyAddressesSection = () => {
    const { addresses, fetchAddresses, determineShippingLocation } = useShop();
    const notification = useNotification();
    const confirmation = useConfirmation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);

    const handleOpenModal = (address = null) => {
        if (!address && addresses.length >= 5) {
            notification.show("Você já possui 5 endereços cadastrados. Exclua um para adicionar outro.", "error");
            return;
        }
        setEditingAddress(address);
        setIsModalOpen(true);
    };

    const handleSaveAddress = async (formData) => {
        try {
            if (editingAddress) {
                await apiService(`/addresses/${editingAddress.id}`, 'PUT', formData);
                notification.show('Endereço atualizado!');
            } else {
                await apiService('/addresses', 'POST', formData);
                notification.show('Endereço adicionado!');
            }
            await fetchAddresses();
            determineShippingLocation(); 
            setIsModalOpen(false);
        } catch (error) {
            notification.show(`Erro: ${error.message}`, 'error');
        }
    };
    
    const handleDeleteAddress = (id) => {
        confirmation.show("Tem certeza que deseja excluir este endereço?", async () => {
            try {
                await apiService(`/addresses/${id}`, 'DELETE');
                notification.show('Endereço excluído.');
                await fetchAddresses();
                determineShippingLocation(); 
            } catch (error) {
                notification.show(`Erro: ${error.message}`, 'error');
            }
        });
    };
    
    const handleSetDefault = async (id) => {
        try {
            await apiService(`/addresses/${id}/default`, 'PUT');
            notification.show('Endereço padrão atualizado.');
            await fetchAddresses();
            determineShippingLocation();
        } catch (error) {
            notification.show(`Erro: ${error.message}`, 'error');
        }
    };
    
    return (
        <>
            <AnimatePresence>
                {isModalOpen && (
                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingAddress ? 'Editar Endereço' : 'Adicionar Endereço'}>
                        <AddressForm initialData={editingAddress} onSave={handleSaveAddress} onCancel={() => setIsModalOpen(false)} />
                    </Modal>
                )}
            </AnimatePresence>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-amber-400">Meus Endereços</h2>
                <button 
                    onClick={() => handleOpenModal()} 
                    disabled={addresses.length >= 5}
                    className="bg-amber-500 text-black px-4 py-2 rounded-md hover:bg-amber-400 font-bold text-sm disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <PlusIcon className="h-5 w-5" />
                    Adicionar Novo
                </button>
            </div>
             {addresses.length >= 5 && (
                <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-300 text-sm p-3 rounded-md mb-6 flex items-center gap-2">
                    <ExclamationCircleIcon className="h-5 w-5" />
                    Você atingiu o limite de 5 endereços. Para adicionar um novo, por favor, exclua um existente.
                </div>
            )}
            {addresses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {addresses.map(addr => (
                        <div key={addr.id} className="bg-gray-800 p-5 rounded-lg border border-gray-700 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg">{addr.alias}</h3>
                                {addr.is_default ? (
                                    <span className="text-xs bg-amber-400 text-black px-3 py-1 rounded-full font-semibold flex items-center gap-1"><CheckIcon className="h-3 w-3"/> Padrão</span>
                                ) : (
                                    <button onClick={() => handleSetDefault(addr.id)} className="text-xs text-amber-400 hover:underline">Tornar Padrão</button>
                                )}
                            </div>
                            <div className="text-sm text-gray-300 flex-grow">
                                <p>{addr.logradouro}, {addr.numero} {addr.complemento && `- ${addr.complemento}`}</p>
                                <p>{addr.bairro}, {addr.localidade} - {addr.uf}</p>
                                <p>{addr.cep}</p>
                            </div>
                            <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-700">
                                <button onClick={() => handleOpenModal(addr)} className="p-2 text-gray-400 hover:text-white"><EditIcon className="h-5 w-5"/></button>
                                <button onClick={() => handleDeleteAddress(addr.id)} className="p-2 text-gray-400 hover:text-red-500"><TrashIcon className="h-5 w-5"/></button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <EmptyState 
                    icon={<MapPinIcon className="h-12 w-12"/>}
                    title="Nenhum endereço cadastrado"
                    message="Adicione seu primeiro endereço para agilizar suas compras."
                    buttonText="Adicionar Endereço"
                    onButtonClick={() => handleOpenModal()}
                />
            )}
        </>
    );
};

const MyProfileSection = () => {
    const { user, setUser } = useAuth();
    const notification = useNotification();

    // Estados para o Modal de Senha
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [isPasswordLoading, setIsPasswordLoading] = useState(false);

    // Estados para o Modal de 2FA
    const [is2faModalOpen, setIs2faModalOpen] = useState(false);
    const [is2faDisableModalOpen, setIs2faDisableModalOpen] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [twoFactorSecret, setTwoFactorSecret] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [disablePassword, setDisablePassword] = useState('');
    const [disableVerificationCode, setDisableVerificationCode] = useState(''); // NOVO ESTADO
    const [is2faLoading, setIs2faLoading] = useState(false);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            notification.show("A nova senha deve ter pelo menos 6 caracteres.", "error");
            return;
        }
        setIsPasswordLoading(true);
        try {
            await apiService('/users/me/password', 'PUT', { password: newPassword });
            notification.show('Senha alterada com sucesso!');
            setNewPassword('');
            setIsPasswordModalOpen(false);
        } catch (error) {
            notification.show(`Erro: ${error.message}`, 'error');
        } finally {
            setIsPasswordLoading(false);
        }
    };

    const handleGenerate2FA = async () => {
        setIs2faLoading(true);
        try {
            const data = await apiService('/2fa/generate', 'POST');
            setQrCodeUrl(data.qrCodeUrl);
            setTwoFactorSecret(data.secret);
            setIs2faModalOpen(true);
        } catch (error) {
            notification.show(`Erro ao gerar código 2FA: ${error.message}`, 'error');
        } finally {
            setIs2faLoading(false);
        }
    };

    const handleVerifyAndEnable2FA = async (e) => {
        e.preventDefault();
        setIs2faLoading(true);
        try {
            await apiService('/2fa/verify-enable', 'POST', { token: verificationCode });
            notification.show('Autenticação de Dois Fatores ativada com sucesso!');
            const updatedUser = { ...user, is_two_factor_enabled: 1 };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setIs2faModalOpen(false);
        } catch (error) {
            notification.show(`Erro na verificação: ${error.message}`, 'error');
        } finally {
            setIs2faLoading(false);
        }
    };

    const handleDisable2FA = async (e) => {
        e.preventDefault();
        setIs2faLoading(true);
        try {
            await apiService('/2fa/disable', 'POST', { 
                password: disablePassword,
                token: disableVerificationCode // ENVIA O TOKEN
            });
            notification.show('Autenticação de Dois Fatores desativada.');
            const updatedUser = { ...user, is_two_factor_enabled: 0 };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setIs2faDisableModalOpen(false);
            setDisablePassword('');
            setDisableVerificationCode(''); // LIMPA O ESTADO
        } catch (error) {
            notification.show(`Erro ao desativar: ${error.message}`, 'error');
        } finally {
            setIs2faLoading(false);
        }
    };

    return (
        <>
            <AnimatePresence>
                {isPasswordModalOpen && (
                    <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} title="Alterar Senha">
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md" />
                            </div>
                            <button type="submit" disabled={isPasswordLoading} className="w-full bg-amber-500 text-black font-bold py-2 rounded-md hover:bg-amber-400 flex justify-center items-center disabled:opacity-50">
                                {isPasswordLoading ? <SpinnerIcon/> : "Confirmar Alteração"}
                            </button>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {is2faModalOpen && (
                    <Modal isOpen={true} onClose={() => setIs2faModalOpen(false)} title="Ativar Autenticação de Dois Fatores">
                        <div className="text-center space-y-4">
                            <p className="text-gray-600">1. Escaneie este QR Code com seu aplicativo autenticador (Google Authenticator, Authy, etc).</p>
                            <img src={qrCodeUrl} alt="QR Code para 2FA" className="mx-auto border-4 border-white shadow-lg"/>
                            <p className="text-gray-600 text-sm">Se não puder escanear, insira esta chave manualmente:</p>
                            <p className="font-mono bg-gray-200 p-2 rounded-md text-gray-800 break-all">{twoFactorSecret}</p>
                            <form onSubmit={handleVerifyAndEnable2FA} className="space-y-3 pt-4 border-t">
                                <label className="block text-sm font-medium text-gray-700">2. Insira o código de 6 dígitos gerado:</label>
                                <input 
                                    type="text" 
                                    value={verificationCode}
                                    onChange={e => setVerificationCode(e.target.value)}
                                    maxLength="6"
                                    placeholder="123456"
                                    className="w-full max-w-xs mx-auto text-center tracking-[0.5em] p-2 bg-gray-100 border border-gray-300 rounded-md text-xl font-mono"
                                />
                                <button type="submit" disabled={is2faLoading} className="w-full max-w-xs mx-auto bg-green-600 text-white font-bold py-2 rounded-md hover:bg-green-700 flex justify-center items-center disabled:opacity-50">
                                    {is2faLoading ? <SpinnerIcon/> : "Ativar e Verificar"}
                                </button>
                            </form>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {is2faDisableModalOpen && (
                     <Modal isOpen={true} onClose={() => setIs2faDisableModalOpen(false)} title="Desativar Autenticação de Dois Fatores">
                        <form onSubmit={handleDisable2FA} className="space-y-4">
                            <p className="text-red-700 bg-red-100 p-3 rounded-md text-sm">Atenção: Para desativar o 2FA, por segurança, você deve fornecer sua **senha** e um **código de autenticação** válido.</p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sua Senha</label>
                                <input type="password" value={disablePassword} onChange={e => setDisablePassword(e.target.value)} required className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Código de Autenticação (2FA)</label>
                                <input 
                                    type="text" 
                                    value={disableVerificationCode} 
                                    onChange={e => setDisableVerificationCode(e.target.value)}
                                    maxLength="6"
                                    placeholder="123456"
                                    required 
                                    className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md text-center font-mono tracking-widest"
                                />
                            </div>
                            <button type="submit" disabled={is2faLoading} className="w-full bg-red-600 text-white font-bold py-2 rounded-md hover:bg-red-700 flex justify-center items-center disabled:opacity-50">
                                {is2faLoading ? <SpinnerIcon/> : "Confirmar e Desativar"}
                            </button>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>

            <h2 className="text-2xl font-bold text-amber-400 mb-6">Meus Dados</h2>
            <div className="bg-gray-800 p-6 rounded-lg space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center"><strong className="w-24 text-gray-400 flex-shrink-0">Nome:</strong><span className="text-white">{user?.name}</span></div>
                <div className="flex flex-col sm:flex-row sm:items-center"><strong className="w-24 text-gray-400 flex-shrink-0">Email:</strong><span className="text-white">{user?.email}</span></div>
            </div>
            <button onClick={() => setIsPasswordModalOpen(true)} className="mt-6 bg-gray-700 text-white font-bold py-2 px-6 rounded-md hover:bg-gray-600">Alterar Senha</button>

            {user?.role === 'admin' && (
                <div className="mt-8 pt-6 border-t border-gray-800">
                    <h3 className="text-xl font-bold text-amber-400 mb-4">Segurança (Admin)</h3>
                    <div className="bg-gray-800 p-6 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h4 className="font-bold flex items-center gap-2"><ShieldCheckIcon className="h-5 w-5 text-amber-400"/> Autenticação de Dois Fatores (2FA)</h4>
                            <p className="text-sm text-gray-400 mt-1">Aumente a segurança da sua conta exigindo um código de verificação ao fazer login.</p>
                        </div>
                        {user.is_two_factor_enabled ? (
                            <div className="text-center flex-shrink-0">
                                <p className="text-sm font-semibold text-green-400 bg-green-900/50 px-3 py-1 rounded-full mb-2">Ativo</p>
                                <button onClick={() => setIs2faDisableModalOpen(true)} className="text-xs text-red-400 hover:underline">Desativar</button>
                            </div>
                        ) : (
                            <button onClick={handleGenerate2FA} disabled={is2faLoading} className="bg-amber-500 text-black font-bold py-2 px-4 rounded-md hover:bg-amber-400 flex items-center justify-center disabled:opacity-50 flex-shrink-0">
                                {is2faLoading ? <SpinnerIcon/> : "Ativar 2FA"}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};


const AjudaPage = ({ onNavigate }) => {
    const faqData = [
        {
            q: "Como posso rastrear meu pedido?",
            a: <>Para rastrear seu pedido, acesse a seção <a href="#account/orders" onClick={(e) => { e.preventDefault(); onNavigate('account/orders'); }} className="text-amber-400 underline hover:text-amber-300">"Meus Pedidos"</a> em sua conta, localize o pedido desejado e clique em "Ver Detalhes". Se houver um código de rastreio, ele estará disponível lá, junto com um botão para rastreá-lo.</>
        },
        {
            q: "Quais são as formas de pagamento aceitas?",
            a: <>Aceitamos pagamentos via Pix, Boleto Bancário e Cartão de Crédito. Todos os pagamentos são processados de forma segura através do Mercado Pago. Você pode parcelar suas compras no cartão de crédito, e as opções de parcelamento serão exibidas na página de finalização da compra.</>
        },
        {
            q: "Qual é o prazo de entrega?",
            a: <>O prazo de entrega varia de acordo com o seu CEP e a modalidade de envio escolhida (PAC ou Sedex). Você pode calcular o prazo estimado na página do produto ou no carrinho de compras antes de finalizar o pedido. Para João Pessoa, PB, também oferecemos a opção de retirada na loja.</>
        },
        {
            q: "Como funciona a política de troca e devolução?",
            a: <>Você pode solicitar a troca ou devolução de um produto em até 7 dias corridos após o recebimento. O produto não deve apresentar sinais de uso e deve estar em sua embalagem original. Para iniciar o processo, acesse a página de detalhes do seu pedido em <a href="#account/orders" onClick={(e) => { e.preventDefault(); onNavigate('account/orders'); }} className="text-amber-400 underline hover:text-amber-300">"Meus Pedidos"</a> e utilize a opção de solicitar cancelamento/reembolso, informando o motivo.</>
        },
    ];

    const AccordionItem = ({ question, answer }) => {
        const [isOpen, setIsOpen] = useState(false);
        return (
            <div className="border-b border-gray-800">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex justify-between items-center text-left py-4 px-2"
                >
                    <span className="font-semibold text-lg text-white">{question}</span>
                    <ChevronDownIcon className={`h-6 w-6 text-amber-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                        >
                            <div className="pb-4 px-2 text-gray-400">{answer}</div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <div className="bg-black text-white min-h-screen py-12">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-amber-400">Central de Ajuda</h1>
                    <p className="text-lg text-gray-400">Como podemos ajudar você hoje?</p>
                </div>

                <div className="mb-16">
                    <h2 className="text-2xl font-bold text-center mb-8">Ações Rápidas</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div onClick={() => onNavigate('account/orders')} className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-center cursor-pointer hover:border-amber-400 hover:bg-gray-800 transition-all">
                            <TruckIcon className="h-10 w-10 mx-auto text-amber-400 mb-3" />
                            <h3 className="font-semibold text-xl">Rastrear Pedido</h3>
                            <p className="text-sm text-gray-500 mt-1">Acompanhe o status da sua entrega.</p>
                        </div>
                        <div onClick={() => onNavigate('account')} className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-center cursor-pointer hover:border-amber-400 hover:bg-gray-800 transition-all">
                            <UserIcon className="h-10 w-10 mx-auto text-amber-400 mb-3" />
                            <h3 className="font-semibold text-xl">Minha Conta</h3>
                            <p className="text-sm text-gray-500 mt-1">Veja seus pedidos e dados cadastrais.</p>
                        </div>
                        <div onClick={() => onNavigate('checkout')} className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-center cursor-pointer hover:border-amber-400 hover:bg-gray-800 transition-all">
                            <CurrencyDollarIcon className="h-10 w-10 mx-auto text-amber-400 mb-3" />
                            <h3 className="font-semibold text-xl">Pagamentos</h3>
                            <p className="text-sm text-gray-500 mt-1">Conheça nossas formas de pagamento.</p>
                        </div>
                    </div>
                </div>

                <div className="mb-16">
                    <h2 className="text-2xl font-bold text-center mb-8">Perguntas Frequentes</h2>
                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                        {faqData.map((faq, index) => (
                            <AccordionItem key={index} question={faq.q} answer={faq.a} />
                        ))}
                    </div>
                </div>

                <div className="text-center bg-gray-900 p-8 rounded-lg border border-gray-800">
                    <h2 className="text-2xl font-bold mb-2">Ainda precisa de ajuda?</h2>
                    <p className="text-gray-400 mb-6">Nossa equipe está pronta para te atender em nossos canais oficiais.</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                         <a href="https://wa.me/5583987379573" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 bg-green-500 text-white font-bold p-4 rounded-lg hover:bg-green-600 transition-colors w-full sm:w-auto">
                            <WhatsappIcon className="h-6 w-6" />
                            <span>Contatar via WhatsApp</span>
                        </a>
                        <a href="https://www.instagram.com/lovecestaseperfumesjp/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 bg-pink-500 text-white font-bold p-4 rounded-lg hover:bg-pink-600 transition-colors w-full sm:w-auto">
                            <InstagramIcon className="h-6 w-6" />
                            <span>Mensagem no Instagram</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AboutPage = () => {
    return (
        <div className="bg-black text-white min-h-screen py-16">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-amber-400">Sobre Nós</h1>
                    <p className="text-lg text-gray-400">Elegância que Veste e Perfuma</p>
                </div>

                <div className="bg-gray-900 p-8 rounded-lg border border-gray-800 space-y-8 text-lg text-gray-300 leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">Nossa História</h2>
                        <p>A Love Cestas e Perfumes nasceu de uma paixão por aromas marcantes e pela moda que expressa identidade. Fundada em João Pessoa, Paraíba, nossa missão sempre foi oferecer mais do que produtos; oferecemos uma experiência de autoestima e bem-estar. Cada peça de roupa é selecionada com um olhar atento às tendências e à qualidade, e cada perfume é escolhido por sua capacidade de criar memórias inesquecíveis.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">Nossa Missão</h2>
                        <p>Nossa missão é simples: realçar a beleza e a confiança de cada cliente. Acreditamos que a combinação de uma fragrância envolvente e um look que reflete sua personalidade tem o poder de transformar o dia a dia. Trabalhamos para ser sua primeira escolha quando o assunto é se sentir bem, seja para uma ocasião especial ou para o conforto do cotidiano.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">Nossos Valores</h2>
                        <ul className="list-disc list-inside space-y-2">
                            <li><span className="font-semibold text-amber-400">Qualidade:</span> Comprometimento com produtos de alta durabilidade e procedência.</li>
                            <li><span className="font-semibold text-amber-400">Atendimento:</span> Uma experiência de compra próxima e atenciosa, do primeiro clique à entrega.</li>
                            <li><span className="font-semibold text-amber-400">Confiança:</span> Transparência em todos os processos para construir um relacionamento sólido com você.</li>
                            <li><span className="font-semibold text-amber-400">Paixão:</span> Amor em cada detalhe, desde a seleção dos produtos até a embalagem que chega em sua casa.</li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
};

const PrivacyPolicyPage = () => {
    return (
        <div className="bg-black text-white min-h-screen py-16">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-amber-400">Política de Privacidade</h1>
                    <p className="text-gray-400">Última atualização: 16 de Outubro de 2025</p>
                </div>
                <div className="bg-gray-900 p-8 rounded-lg border border-gray-800 space-y-6 text-gray-300 leading-relaxed">
                    <p>Sua privacidade é importante para nós. É política da LovecestasePerfumes respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar em nosso site.</p>
                    
                    <h3 className="text-xl font-bold text-white pt-4">1. Coleta de Dados</h3>
                    <p>Solicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento. Também informamos por que estamos coletando e como será usado.</p>

                    <h3 className="text-xl font-bold text-white pt-4">2. Uso de Dados</h3>
                    <p>Apenas retemos as informações coletadas pelo tempo necessário para fornecer o serviço solicitado. Quando armazenamos dados, protegemos dentro de meios comercialmente aceitáveis para evitar perdas e roubos, bem como acesso, divulgação, cópia, uso ou modificação não autorizados.</p>

                    <h3 className="text-xl font-bold text-white pt-4">3. Cookies</h3>
                    <p>Nosso site utiliza cookies para melhorar a sua experiência de navegação. Cookies são pequenos arquivos que são armazenados no seu computador para coletar informações como suas preferências e itens no carrinho. Você pode desativar os cookies nas configurações do seu navegador, mas isso pode afetar a funcionalidade do site.</p>

                    <h3 className="text-xl font-bold text-white pt-4">4. Seus Direitos (LGPD)</h3>
                    <p>Você tem o direito de acessar, corrigir ou excluir suas informações pessoais a qualquer momento. Você pode gerenciar seus dados na seção "Minha Conta" ou entrando em contato conosco. Estamos em conformidade com a Lei Geral de Proteção de Dados (LGPD).</p>

                    <h3 className="text-xl font-bold text-white pt-4">5. Links para Sites de Terceiros</h3>
                    <p>O nosso site pode ter links para sites externos que não são operados por nós. Esteja ciente de que não temos controle sobre o conteúdo e práticas desses sites e não podemos aceitar responsabilidade por suas respectivas políticas de privacidade.</p>
                    
                    <h3 className="text-xl font-bold text-white pt-4">6. Contato</h3>
                    <p>Se você tiver alguma dúvida sobre como lidamos com dados do usuário e informações pessoais, entre em contato conosco através dos nossos canais de atendimento na Central de Ajuda.</p>
                </div>
            </div>
        </div>
    );
};

const TermsOfServicePage = () => {
    return (
        <div className="bg-black text-white min-h-screen py-16">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-amber-400">Termos de Serviço</h1>
                    <p className="text-gray-400">Última atualização: 16 de Outubro de 2025</p>
                </div>
                <div className="bg-gray-900 p-8 rounded-lg border border-gray-800 space-y-6 text-gray-300 leading-relaxed">
                    <h3 className="text-xl font-bold text-white">1. Aceitação dos Termos</h3>
                    <p>Ao acessar e usar o site da LovecestasePerfumes, você concorda em cumprir estes Termos de Serviço e todas as leis e regulamentos aplicáveis. Se você não concorda com algum destes termos, está proibido de usar ou acessar este site.</p>

                    <h3 className="text-xl font-bold text-white pt-4">2. Contas de Usuário</h3>
                    <p>Para acessar certas funcionalidades, você pode ser solicitado a criar uma conta. Você é responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorrem em sua conta. Você concorda em nos notificar imediatamente sobre qualquer uso não autorizado de sua conta.</p>

                    <h3 className="text-xl font-bold text-white pt-4">3. Produtos e Preços</h3>
                    <p>Fazemos o nosso melhor para exibir com precisão as cores e imagens dos nossos produtos. Não podemos garantir que a exibição de qualquer cor no monitor do seu computador seja precisa. Os preços dos nossos produtos estão sujeitos a alterações sem aviso prévio. Reservamo-nos o direito de, a qualquer momento, modificar ou descontinuar um produto sem aviso prévio.</p>
                    
                    <h3 className="text-xl font-bold text-white pt-4">4. Pedidos e Pagamentos</h3>
                    <p>Reservamo-nos o direito de recusar qualquer pedido que você fizer conosco. Podemos, a nosso critério, limitar ou cancelar as quantidades compradas por pessoa, por domicílio ou por pedido. No caso de fazermos uma alteração ou cancelarmos um pedido, podemos tentar notificá-lo entrando em contato com o e-mail e/ou endereço de faturamento/número de telefone fornecido no momento em que o pedido foi feito.</p>

                    <h3 className="text-xl font-bold text-white pt-4">5. Limitação de Responsabilidade</h3>
                    <p>Em nenhuma circunstância a LovecestasePerfumes será responsável por quaisquer danos (incluindo, sem limitação, danos por perda de dados ou lucro, ou devido a interrupção dos negócios) decorrentes do uso ou da incapacidade de usar os materiais no site da LovecestasePerfumes.</p>
                </div>
            </div>
        </div>
    );
};

// --- PAINEL DO ADMINISTRADOR ---
const AdminLayout = memo(({ activePage, onNavigate, children }) => {
    const { user, logout } = useAuth(); // Importa 'user'
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [newOrdersCount, setNewOrdersCount] = useState(0);
    const mainContentRef = useRef(null); // <-- ADICIONADO O REF

    useEffect(() => {
        apiService('/orders')
            .then(data => {
                if (!Array.isArray(data)) {
                    console.error("Os dados recebidos da API de pedidos não são uma lista (array).", data);
                    setNewOrdersCount(0);
                    return;
                }

                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const recentOrders = data.filter(o => {
                    if (!o || !o.date) return false;
                    const orderDate = new Date(o.date);
                    return !isNaN(orderDate) && orderDate > twentyFourHoursAgo;
                });
                setNewOrdersCount(recentOrders.length);
            })
            .catch(err => {
                console.error("Falha crítica ao buscar contagem de novos pedidos:", err);
                setNewOrdersCount(0);
            });
    }, [activePage]);

    const handleLogout = () => {
        logout();
        onNavigate('home');
    }

   const menuItems = [
        { key: 'dashboard', label: 'Dashboard', icon: <ChartIcon className="h-5 w-5"/> },
        { key: 'banners', label: 'Banners', icon: <PhotoIcon className="h-5 w-5"/> },
        { key: 'products', label: 'Produtos', icon: <BoxIcon className="h-5 w-5"/> },
        { key: 'orders', label: 'Pedidos', icon: <TruckIcon className="h-5 w-5"/> },
        { key: 'refunds', label: 'Reembolsos', icon: <CurrencyDollarArrowIcon className="h-5 w-5"/> },
        { key: 'collections', label: 'Coleções', icon: <SparklesIcon className="h-5 w-5"/> },
        { key: 'users', label: 'Usuários', icon: <UsersIcon className="h-5 w-5"/> },
        { key: 'coupons', label: 'Cupons', icon: <TagIcon className="h-5 w-5"/> },
        { key: 'reports', label: 'Relatórios', icon: <FileIcon className="h-5 w-5"/> },
        { key: 'logs', label: 'Histórico de Ações', icon: <ClipboardDocListIcon className="h-5 w-5"/> },
    ];

    return (
        <div className="h-screen flex overflow-hidden bg-gray-100 text-gray-800">
            {/* Sidebar */}
            <aside className={`bg-gray-900 text-white w-64 fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-transform duration-200 ease-in-out z-50 flex flex-col`}>
                <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800 flex-shrink-0">
                    <span className="text-xl font-bold text-amber-400">ADMIN</span>
                    <button className="lg:hidden p-2" onClick={() => setIsSidebarOpen(false)}>
                        <CloseIcon className="h-6 w-6"/>
                    </button>
                </div>
                <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
                    {menuItems.map(item => (
                        <a 
                            href="#" 
                            key={item.key} 
                            onClick={(e) => { e.preventDefault(); onNavigate(`admin/${item.key}`); setIsSidebarOpen(false); }} 
                            className={`flex items-center justify-between px-4 py-2 rounded-md transition-colors ${activePage.startsWith(item.key) ? 'bg-amber-500 text-black' : 'hover:bg-gray-800'}`}
                        >
                            <div className="flex items-center space-x-3">
                                {item.icon}
                                <span>{item.label}</span>
                            </div>
                            {item.key === 'orders' && newOrdersCount > 0 && (
                                <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                    {newOrdersCount}
                                </span>
                            )}
                        </a>
                    ))}
                </nav>
                <div className="p-4 border-t border-gray-800 flex-shrink-0">
                    <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('home'); }} className="w-full text-left flex items-center px-4 py-2 rounded-md hover:bg-gray-800 mb-2">🏠 Voltar à Loja</a>
                    <button onClick={handleLogout} className="w-full text-left flex items-center px-4 py-2 rounded-md hover:bg-gray-800">🚪 Sair</button>
                </div>
            </aside>
             {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white shadow-md h-16 flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
                     <button onClick={() => setIsSidebarOpen(true)} className="p-2 lg:hidden">
                        <MenuIcon className="h-6 w-6 text-gray-600"/>
                     </button>
                     <h1 className="text-lg font-bold ml-4 capitalize lg:hidden">{activePage.split('/')[0]}</h1>
                     <div className="hidden lg:block">
                        <span className="text-xl font-semibold">Bem-vindo, {user?.name.split(' ')[0]} 👋</span>
                     </div>
                     <div className="flex items-center gap-4">
                        <button onClick={() => onNavigate('home')} className="p-2 text-gray-600 hover:text-black" title="Ver a Loja">
                            <EyeIcon className="h-6 w-6" />
                        </button>
                        <button onClick={handleLogout} className="p-2 text-gray-600 hover:text-red-600" title="Sair">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                     </div>
                </header>
                <main ref={mainContentRef} className="flex-grow p-4 sm:p-6 overflow-y-auto">
                    {children}
                </main>
                <BackToTopButton scrollableRef={mainContentRef} />
            </div>
        </div>
    );
});

const AdminDashboard = ({ onNavigate }) => {
    const { user } = useAuth();
    const notification = useNotification();
    const [stats, setStats] = useState({ totalRevenue: 0, totalSales: 0, newCustomers: 0, pendingOrders: 0, prevPeriodRevenue: 0 });
    const [lowStockProducts, setLowStockProducts] = useState([]); // <-- A lista completa ainda é buscada aqui
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [selectedStockItem, setSelectedStockItem] = useState(null);
    const [activeFilter, setActiveFilter] = useState('month');
    const [isLoadingData, setIsLoadingData] = useState(true);
    // REMOVIDO: const [lowStockSearchTerm, setLowStockSearchTerm] = useState('');

    // Estados separados para os dados dos gráficos
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

            doc.setFontSize(18);
            doc.text(title, pageWidth / 2, 16, { align: 'center' });
            doc.setFontSize(8);
            doc.text(timestamp, pageWidth - 14, 10, { align: 'right' });
            doc.autoTable({
                head: [headers],
                body: data,
                startY: 25
            });
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
            if (format === 'pdf') {
                generatePdf(data.map(Object.values), ['Pedido ID', 'Cliente', 'Data', 'Total', 'Status'], 'Relatorio de Vendas');
            } else {
                generateExcel(data, 'relatorio_vendas');
            }
        } catch (error) {
            notification.show(`Falha ao gerar relatório de vendas: ${error.message}`, 'error');
        }
    };

    const handleStockExport = async (format) => {
        try {
            const products = await apiService('/products/all');
            const data = products.map(p => ({ Produto: p.name, Marca: p.brand, Estoque: p.stock, Preço: p.price }));
            if (format === 'pdf') {
                generatePdf(data.map(Object.values), ['Produto', 'Marca', 'Estoque', 'Preço'], 'Relatorio de Estoque');
            } else {
                generateExcel(data, 'relatorio_estoque');
            }
        } catch (error) {
            notification.show(`Falha ao gerar relatório de estoque: ${error.message}`, 'error');
        }
    };

    const fetchDashboardData = useCallback((filter = 'month') => {
        setIsLoadingData(true);
        console.log(`Fetching dashboard data with filter: ${filter}`);
        Promise.all([
            apiService(`/reports/dashboard?filter=${filter}`).catch(err => {
                console.error('Error fetching dashboard report data:', err);
                notification.show(`Erro ao carregar dados do dashboard: ${err.message}`, 'error');
                return { stats: { totalRevenue: 0, totalSales: 0, newCustomers: 0, pendingOrders: 0, prevPeriodRevenue: 0 }, dailySales: [], bestSellers: [] };
            }),
            apiService('/products/low-stock').catch(err => {
                console.error('Error fetching low stock products:', err);
                return [];
            })
        ]).then(([reportData, lowStockItems]) => {
            const statsData = reportData?.stats || { totalRevenue: 0, totalSales: 0, newCustomers: 0, pendingOrders: 0, prevPeriodRevenue: 0 };
            const dailySalesData = reportData?.dailySales || [];
            const bestSellersData = reportData?.bestSellers || [];

            setStats(statsData);
            setDailySalesData(dailySalesData);
            setBestSellersData(bestSellersData);
            setLowStockProducts(lowStockItems || []); // <-- A lista completa é salva no estado
        }).finally(() => {
            setIsLoadingData(false);
        });
    }, [notification]);

    useEffect(() => {
        fetchDashboardData(activeFilter);
    }, [activeFilter, fetchDashboardData]);

    // Efeito para RENDERIZAR os gráficos
    useEffect(() => {
        if (!isLoadingData) {
            const renderCharts = () => {
                if (window.Chart) {
                    // Gráfico de Vendas Diárias
                    const dailySalesCtx = document.getElementById('dailySalesChart')?.getContext('2d');
                    if (dailySalesCtx && dailySalesData) {
                        if (window.myDailySalesChart) window.myDailySalesChart.destroy();

                        // --- CORREÇÃO DA DATA ---
                        // Transforma 'YYYY-MM-DD' (ou data ISO) em uma data local segura
                        const safeLabels = dailySalesData.map(d => {
                            if (!d.sale_date) return "Data Inválida";
                            // A API retorna uma data (ex: 2025-10-18T03:00:00.000Z)
                            const dateObj = new Date(d.sale_date);
                            if (isNaN(dateObj.getTime())) {
                                // Fallback se a string de data for apenas YYYY-MM-DD
                                const parts = d.sale_date.split('-');
                                if (parts.length === 3) {
                                     // new Date(ano, mês_zero_indexado, dia) - cria data local
                                     const dateObjFallback = new Date(parts[0], parts[1] - 1, parts[2]);
                                     return dateObjFallback.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                                }
                                return "Data Inválida";
                            }
                            // Formata a data na localidade BR, tratando como UTC para evitar problemas de fuso
                            return dateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                        });

                        window.myDailySalesChart = new window.Chart(dailySalesCtx, {
                            type: 'line',
                            data: {
                                labels: safeLabels, // <-- USA AS LABELS CORRIGIDAS
                                datasets: [{
                                    label: 'Faturamento Diário (R$)',
                                    data: dailySalesData.map(d => d.daily_total),
                                    borderColor: 'rgba(212, 175, 55, 1)',
                                    backgroundColor: 'rgba(212, 175, 55, 0.2)',
                                    fill: true, tension: 0.3
                                }]
                            },
                            options: { responsive: true, maintainAspectRatio: false }
                        });
                    } else if (!isLoadingData) {
                        console.warn("Elemento canvas 'dailySalesChart' não encontrado ou dados ausentes.");
                    }

                    // Gráfico de Mais Vendidos
                    const bestSellersCtx = document.getElementById('bestSellersChart')?.getContext('2d');
                    if (bestSellersCtx && bestSellersData) {
                        if (window.myBestSellersChart) window.myBestSellersChart.destroy();
                        window.myBestSellersChart = new window.Chart(bestSellersCtx, {
                            type: 'bar',
                            data: {
                                labels: bestSellersData.map(p => p.name),
                                datasets: [{
                                    label: 'Unidades Vendidas',
                                    data: bestSellersData.map(p => p.sales || 0),
                                    backgroundColor: [
                                        'rgba(212, 175, 55, 0.8)', 'rgba(192, 192, 192, 0.8)',
                                        'rgba(205, 127, 50, 0.8)', 'rgba(169, 169, 169, 0.8)',
                                        'rgba(245, 222, 179, 0.8)'
                                    ],
                                    borderWidth: 1
                                }]
                            },
                            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
                        });
                    } else if (!isLoadingData) {
                        console.warn("Elemento canvas 'bestSellersChart' não encontrado ou dados ausentes.");
                    }
                } else {
                    console.warn("Biblioteca Chart.js não carregada, tentando novamente em 100ms...");
                    setTimeout(renderCharts, 100);
                }
            };

            // Adiciona um pequeno delay para garantir que o DOM esteja 100% pronto
            setTimeout(renderCharts, 0);

        }
    }, [isLoadingData, dailySalesData, bestSellersData]); // Roda quando o carregamento termina ou os dados dos gráficos mudam

    const handleQuickStockSave = () => {
        setIsStockModalOpen(false);
        setSelectedStockItem(null);
        fetchDashboardData(activeFilter);
    };

    const handleFilterClick = (filter) => {
        setActiveFilter(filter);
    };

    const calculateGrowth = () => {
        if (!stats || stats.prevPeriodRevenue === undefined || stats.totalRevenue === undefined) {
            return { text: '--', color: 'text-gray-500' };
        }
        const prevRevenue = Number(stats.prevPeriodRevenue);
        const currentRevenue = Number(stats.totalRevenue);

        if (prevRevenue === 0) {
            return currentRevenue > 0 ? { text: '+∞%', color: 'text-green-600' } : { text: '0.0%', color: 'text-gray-500' };
        }
        const growth = ((currentRevenue - prevRevenue) / prevRevenue) * 100;
        if (growth > 0) return { text: `+${growth.toFixed(1)}%`, color: 'text-green-600' };
        if (growth < 0) return { text: `${growth.toFixed(1)}%`, color: 'text-red-600' };
        return { text: '0.0%', color: 'text-gray-500' };
    };
    const growth = calculateGrowth();

    const getComparisonText = () => {
        switch(activeFilter) {
            case 'today': return 'vs. Ontem';
            case 'week': return 'vs. Semana Anterior';
            case 'year': return 'vs. Ano Anterior';
            case 'month':
            default: return 'vs. Mês Anterior';
        }
    };

    const LowStockAlerts = () => { // A prop 'lowStockProducts' é recebida implicitamente agora
        // --- INÍCIO: Estado e Lógica movidos para cá ---
        const [lowStockSearchTerm, setLowStockSearchTerm] = useState('');

        // Filtra os produtos com estoque baixo usando a lista completa vinda do estado pai
        const filteredLowStockProducts = lowStockProducts.filter(item =>
            item.name.toLowerCase().includes(lowStockSearchTerm.toLowerCase())
            // Adicionar filtro por SKU se disponível no futuro: || (item.sku && item.sku.toLowerCase().includes(lowStockSearchTerm.toLowerCase()))
        );
        // --- FIM: Estado e Lógica movidos para cá ---

        if (lowStockProducts.length === 0) return null;

        return (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow">
                <div className="flex items-center">
                    <ExclamationIcon className="h-6 w-6 text-yellow-500 mr-3"/>
                    <div>
                        <h3 className="font-bold text-yellow-800">Alerta de Estoque Baixo</h3>
                        <p className="text-sm text-yellow-700">
                            {lowStockProducts.length} item(ns) precisam de atenção.
                        </p>
                    </div>
                </div>
                 {/* Input de busca usa o estado local */}
                <div className="mt-4 mb-2 relative">
                     <input
                        type="text"
                        placeholder="Buscar produto em alerta..."
                        value={lowStockSearchTerm} // Usa estado local
                        onChange={(e) => setLowStockSearchTerm(e.target.value)} // Atualiza estado local
                        className="w-full p-2 pl-8 border border-gray-300 rounded-md text-sm"
                    />
                    <SearchIcon className="h-4 w-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2"/>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                    {filteredLowStockProducts.length > 0 ? (
                        filteredLowStockProducts.map(item => ( // Usa a lista filtrada localmente
                             <div key={item.id + item.name} className="flex justify-between items-center text-sm p-2 bg-white rounded-md border">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <img src={getFirstImage(item.images)} alt={item.name} className="w-8 h-8 object-contain rounded bg-gray-100 flex-shrink-0"/>
                                    <span className="text-gray-800 truncate">{item.name}</span>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className="font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full text-xs">
                                        Restam: {item.stock}
                                    </span>
                                    <button
                                        onClick={() => {
                                            setSelectedStockItem(item);
                                            setIsStockModalOpen(true);
                                        }}
                                        className="text-green-600 hover:underline text-xs font-semibold"
                                    >
                                        Atualizar
                                    </button>
                                    <button onClick={() => {
                                        const baseName = item.name.split(' (')[0];
                                        onNavigate(`admin/products?search=${encodeURIComponent(baseName)}`);
                                    }} className="text-blue-600 hover:underline text-xs font-semibold">
                                        Ver
                                    </button>
                                </div>
                             </div>
                        ))
                    ) : (
                        <p className="text-center text-sm text-gray-500 py-4">Nenhum produto encontrado na busca.</p>
                    )}
                </div>
            </div>
        );
    };

    const StatCard = ({ title, value, comparisonValue, growth }) => (
        <motion.div
            className="bg-white p-6 rounded-lg shadow"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <h4 className="text-gray-500">{title}</h4>
            <div className="flex justify-between items-baseline">
                <p className="text-3xl font-bold">{value}</p>
                {growth && <span className={`font-semibold ${growth.color}`}>{growth.text}</span>}
            </div>
            {comparisonValue && <p className="text-sm text-gray-400">{comparisonValue}</p>}
        </motion.div>
    );

    const FilterButton = ({ label, filterName }) => (
        <button
            onClick={() => handleFilterClick(filterName)}
            className={`px-4 py-1.5 rounded-md font-semibold text-sm transition-colors ${
                activeFilter === filterName ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
        >
            {label}
        </button>
    );

    // REMOVIDO: Lógica de filtragem que estava aqui

    return (
        <div>
            {/* Modais */}
            <AnimatePresence>
                {isStockModalOpen && (
                    <QuickStockUpdateModal
                        item={selectedStockItem}
                        onClose={() => setIsStockModalOpen(false)}
                        onSave={handleQuickStockSave}
                    />
                )}
            </AnimatePresence>

            {/* Header e Filtros */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <div className="flex items-center gap-2">
                    <FilterButton label="Hoje" filterName="today" />
                    <FilterButton label="Semana" filterName="week" />
                    <FilterButton label="Mês" filterName="month" />
                    <FilterButton label="Ano" filterName="year" />
                </div>
            </div>

            {isLoadingData ? (
                <div className="flex justify-center items-center py-20"><SpinnerIcon className="h-10 w-10 text-amber-500" /></div>
            ) : (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <MaintenanceModeToggle />
                        <LowStockAlerts /> {/* Passa a lista completa como prop */}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <StatCard
                            title={`Faturamento (${getComparisonText().replace('vs. ', '')})`}
                            value={`R$ ${Number(stats.totalRevenue).toFixed(2)}`}
                            comparisonValue={`R$ ${Number(stats.prevPeriodRevenue).toFixed(2)} (${getComparisonText()})`}
                            growth={growth}
                        />
                        <StatCard title="Vendas no Período" value={stats.totalSales ?? 0} />
                        <StatCard title="Novos Clientes no Período" value={stats.newCustomers ?? 0} />
                        <StatCard title="Pedidos Pendentes no Período" value={stats.pendingOrders ?? 0} />
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow mb-6">
                        <h3 className="font-bold mb-4">Exportar Relatórios</h3>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button onClick={() => handleSalesExport('excel')} className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center justify-center gap-2"> <DownloadIcon className="h-5 w-5"/> <span>Vendas (Excel)</span> </button>
                            <button onClick={() => handleStockExport('excel')} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"> <DownloadIcon className="h-5 w-5"/> <span>Estoque (Excel)</span> </button>
                            <button onClick={() => handleSalesExport('pdf')} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center justify-center gap-2"> <DownloadIcon className="h-5 w-5"/> <span>Vendas (PDF)</span> </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow min-h-[300px]"> {/* Altura mínima */}
                            <h3 className="font-bold mb-4">Vendas Diárias ({getComparisonText().replace('vs. ', '')})</h3>
                            <div className="relative h-64"> {/* Container com altura definida */}
                                <canvas id="dailySalesChart"></canvas>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow min-h-[300px]"> {/* Altura mínima */}
                            <h3 className="font-bold mb-4">Mais Vendidos ({getComparisonText().replace('vs. ', '')})</h3>
                            <div className="relative h-64"> {/* Container com altura definida */}
                                <canvas id="bestSellersChart"></canvas>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
const VariationInputRow = ({ variation, index, onVariationChange, onRemoveVariation, availableColors, availableSizes, onImageUpload, uploadStatus, isFirstOfColor }) => {
    const galleryInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const handleFileChange = (e) => {
        onImageUpload(e);
    };

    const handleRemoveImage = (imgIndex) => {
        const updatedImages = variation.images.filter((_, i) => i !== imgIndex);
        onVariationChange(index, 'images', updatedImages);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start p-3 bg-gray-50 rounded-md border">
            <div className="md:col-span-3">
                <label className="text-xs text-gray-500">Cor</label>
                <select value={variation.color} onChange={(e) => onVariationChange(index, 'color', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white">
                    <option value="">Selecione a Cor</option>
                    {availableColors.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <div className="md:col-span-2">
                <label className="text-xs text-gray-500">Tamanho</label>
                <input type="text" list="available-sizes" value={variation.size} onChange={(e) => onVariationChange(index, 'size', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" placeholder="Ex: M ou 42"/>
                <datalist id="available-sizes">{availableSizes.map(s => <option key={s} value={s}>{s}</option>)}</datalist>
            </div>
            <div className="md:col-span-2">
                <label className="text-xs text-gray-500">Estoque</label>
                <input type="number" min="0" value={variation.stock} onChange={(e) => onVariationChange(index, 'stock', parseInt(e.target.value, 10) || 0)} className="w-full p-2 border border-gray-300 rounded-md" placeholder="0"/>
            </div>
            <div className={`md:col-span-4 space-y-2 ${!isFirstOfColor && 'opacity-40'}`}>
                 {isFirstOfColor ? (
                    <>
                        <label className="text-xs text-gray-500 font-semibold">Imagens para a cor "{variation.color || '...'}"</label>
                        <div className="p-2 border rounded-md bg-white min-h-[60px]">
                            {variation.images && variation.images.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {variation.images.map((img, imgIndex) => (
                                        <div key={imgIndex} className="relative group">
                                            <img src={img} alt="Variação" className="w-12 h-12 object-cover rounded-md border" />
                                            <button type="button" onClick={() => handleRemoveImage(imgIndex)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><XMarkIcon className="h-3 w-3" /></button>
                                        </div>
                                    ))}
                                </div>
                            ) : ( <p className="text-xs text-gray-400 text-center py-2">Nenhuma imagem</p> )}
                        </div>
                        <div>
                            <input type="file" multiple accept="image/*" ref={galleryInputRef} onChange={handleFileChange} className="hidden" />
                            <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileChange} className="hidden" />
                            <div className="flex gap-2 mt-1">
                                <button type="button" onClick={() => galleryInputRef.current.click()} className="w-1/2 text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-2 rounded-md flex items-center justify-center gap-1"><UploadIcon className="h-4 w-4" /> Galeria</button>
                                <button type="button" onClick={() => cameraInputRef.current.click()} className="w-1/2 text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-2 rounded-md flex items-center justify-center gap-1"><CameraIcon className="h-4 w-4" /> Câmera</button>
                            </div>
                            {uploadStatus && <p className={`text-xs mt-1 ${uploadStatus.startsWith('Erro') ? 'text-red-500' : 'text-green-500'}`}>{uploadStatus}</p>}
                        </div>
                    </>
                 ) : (
                    <div>
                        <label className="text-xs text-gray-500">Imagens</label>
                        <p className="text-xs text-gray-500 p-2 border rounded-md bg-gray-100">As imagens são definidas na primeira variação desta cor.</p>
                    </div>
                 )}
            </div>
            <div className="md:col-span-1 flex items-center justify-center h-full pt-4 md:pt-0">
                <button type="button" onClick={() => onRemoveVariation(index)} className="bg-red-100 text-red-600 p-2 rounded-md hover:bg-red-200"><TrashIcon className="h-5 w-5 mx-auto"/></button>
            </div>
        </div>
    );
};

const AdminCrudForm = ({ item, onSave, onCancel, fieldsConfig }) => {
    const [formData, setFormData] = useState({});

    useEffect(() => {
        const initialData = {};
        fieldsConfig.forEach(field => {
            let defaultValue = ''; // Valor padrão para campos de texto
            if (field.type === 'checkbox') {
                defaultValue = 0;
            } else if (field.type === 'select' && field.options && field.options.length > 0) {
                defaultValue = field.options[0].value; // Define o padrão como o valor da primeira opção
            }
            initialData[field.name] = item?.[field.name] ?? defaultValue;
        });
        setFormData(initialData);
    }, [item, fieldsConfig]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {fieldsConfig.map(field => (
                <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700">{field.label}</label>
                    {field.type === 'select' ? (
                        <select
                            name={field.name}
                            value={formData[field.name] || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"
                            required={field.required}
                        >
                            {field.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    ) : field.type === 'textarea' ? (
                        <textarea
                            name={field.name}
                            value={formData[field.name] || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                            required={field.required}
                            placeholder={field.placeholder || ''}
                        />
                    ) : field.type === 'checkbox' ? (
                        <div className="flex items-center pt-2">
                             <input
                                type="checkbox"
                                name={field.name}
                                checked={!!formData[field.name]}
                                onChange={handleChange}
                                className="h-4 w-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                            />
                        </div>
                    ) : (
                        <input
                            type={field.type}
                            name={field.name}
                            value={formData[field.name] || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                            required={field.required}
                            placeholder={field.placeholder || ''}
                            readOnly={field.editable === false}
                            step={field.step}
                        />
                    )}
                </div>
            ))}
            <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-200 rounded-md hover:bg-gray-300 font-semibold">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 font-semibold">Salvar</button>
            </div>
        </form>
    );
};

const ProductForm = ({ item, onSave, onCancel, productType, setProductType, brands = [], categories = [] }) => {
    const [formData, setFormData] = useState({});
    const [uploadStatus, setUploadStatus] = useState('');
    const [uploadingStatus, setUploadingStatus] = useState({});
    
    // Novos estados para controlar o modo de promoção
    const [promoMode, setPromoMode] = useState('fixed'); // 'fixed' ou 'percentage'
    const [promoPercent, setPromoPercent] = useState('');

    const mainGalleryInputRef = useRef(null);
    const mainCameraInputRef = useRef(null);
    const [allCollectionCategories, setAllCollectionCategories] = useState([]);

    useEffect(() => {
        apiService('/collections/admin')
            .then(data => setAllCollectionCategories(data.filter(c => c.is_active)))
            .catch(err => console.error("Falha ao buscar categorias de coleção", err));
    }, []);
    
    const perfumeBrands = ["O Boticário", "Avon", "Natura", "Eudora"];

    const perfumeFields = [
        { name: 'stock', label: 'Estoque', type: 'number', required: true },
        { name: 'notes', label: 'Notas Olfativas (Ex: Topo: Maçã\\nCorpo: Canela)', type: 'textarea' },
        { name: 'how_to_use', label: 'Como Usar', type: 'textarea' },
        { name: 'ideal_for', label: 'Ideal Para', type: 'textarea' },
        { name: 'volume', label: 'Volume (ex: 100ml)', type: 'text' },
    ];
    
    const clothingFields = [
        { name: 'variations', label: 'Variações (Cor, Tamanho, Estoque, Imagens)', type: 'variations' },
        { name: 'size_guide', label: 'Guia de Medidas (HTML permitido)', type: 'textarea' },
        { name: 'care_instructions', label: 'Cuidados com a Peça (um por linha)', type: 'textarea' },
    ];

   const commonFields = [
        { name: 'name', label: 'Nome do Produto', type: 'text', required: true },
        { name: 'brand', label: 'Marca', type: 'text', required: true },
        { name: 'category', label: 'Categoria', type: 'text', required: true },
        { name: 'price', label: 'Preço Original', type: 'number', required: true, step: '0.01' },
        { name: 'video_url', label: 'Link do Vídeo do YouTube (Opcional)', type: 'url', placeholder: 'https://www.youtube.com/watch?v=...' },
        { name: 'images_upload', label: 'Upload de Imagens Principais', type: 'file' },
        { name: 'images', label: 'URLs das Imagens Principais', type: 'text_array' },
        { name: 'description', label: 'Descrição', type: 'textarea' },
        { name: 'weight', label: 'Peso (kg)', type: 'number', step: '0.01', required: true },
        { name: 'width', label: 'Largura (cm)', type: 'number', required: true },
        { name: 'height', label: 'Altura (cm)', type: 'number', required: true },
        { name: 'length', label: 'Comprimento (cm)', type: 'number', required: true },
        { name: 'is_active', label: 'Produto Ativo', type: 'checkbox' },
    ];

    const allFields = [...commonFields, ...perfumeFields, ...clothingFields];

    useEffect(() => {
        const initialData = {};
        allFields.forEach(field => {
            const value = item?.[field.name];
            if (value !== undefined && value !== null) {
                initialData[field.name] = value;
            } else {
                if (field.type === 'checkbox') {
                    initialData[field.name] = (field.name === 'is_active'); 
                } else if (field.type === 'number') {
                    initialData[field.name] = 0; 
                } else if (field.name === 'images' || field.name === 'variations') {
                    initialData[field.name] = [];
                } else {
                    initialData[field.name] = '';
                }
            }
        });
        
        if (item) {
            setProductType(item.product_type || 'perfume');
            initialData.images = parseJsonString(item.images, []);
            initialData.variations = parseJsonString(item.variations, []);
            
            initialData.is_on_sale = !!item.is_on_sale;
            initialData.sale_price = item.sale_price || '';
            
            if (item.sale_end_date) {
                const date = new Date(item.sale_end_date);
                const localISOTime = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                initialData.sale_end_date = localISOTime;
            } else {
                initialData.sale_end_date = '';
            }

            // Tenta calcular a porcentagem inicial se estiver em promoção
            if (item.is_on_sale && item.price > 0 && item.sale_price > 0) {
                const discount = 1 - (item.sale_price / item.price);
                // Se for um valor arredondado (ex: 0.1, 0.25), assume que pode ter sido por porcentagem, mas mantém 'fixed' por segurança
                // O usuário muda manualmente se quiser.
            }

        } else {
            setProductType('perfume');
            initialData.is_on_sale = false;
            initialData.sale_price = '';
            initialData.sale_end_date = '';
        }

        setFormData(initialData);
    }, [item, setProductType]);

    const availableProductCategories = useMemo(() => {
        return allCollectionCategories.filter(c => c.product_type_association === productType);
    }, [allCollectionCategories, productType]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? (checked ? 1 : 0) : value;

        setFormData(prev => {
            const updated = { ...prev, [name]: newValue };
            
            // Recalcula o preço promocional se o preço original mudar e estiver no modo porcentagem
            if (name === 'price' && promoMode === 'percentage' && promoPercent) {
                const original = parseFloat(newValue);
                if (!isNaN(original)) {
                    const discount = original * (parseFloat(promoPercent) / 100);
                    updated.sale_price = (original - discount).toFixed(2);
                }
            }
            return updated;
        });
    };

    const handleVolumeBlur = (e) => {
        let { value } = e.target;
        if (value && value.trim() !== '' && !isNaN(parseFloat(value)) && !/ml/i.test(value)) {
            const formattedValue = `${parseFloat(value)}ml`;
            setFormData(prev => ({ ...prev, volume: formattedValue }));
        }
    };

    // Lógica para alternar o modo de promoção
    const handlePromoModeChange = (mode) => {
        setPromoMode(mode);
        if (mode === 'percentage') {
            // Se mudar para porcentagem, tenta calcular a % atual baseada nos valores
            if (formData.price && formData.sale_price) {
                const original = parseFloat(formData.price);
                const sale = parseFloat(formData.sale_price);
                if (original > 0) {
                    const percent = ((original - sale) / original) * 100;
                    setPromoPercent(Math.round(percent)); // Arredonda para facilitar
                }
            }
        } else {
            setPromoPercent('');
        }
    };

    // Lógica para alterar a porcentagem
    const handlePercentChange = (e) => {
        const percent = e.target.value;
        setPromoPercent(percent);
        
        if (formData.price && percent !== '') {
            const original = parseFloat(formData.price);
            if (!isNaN(original)) {
                const discount = original * (parseFloat(percent) / 100);
                const newSalePrice = (original - discount).toFixed(2);
                setFormData(prev => ({ ...prev, sale_price: newSalePrice }));
            }
        }
    };
    
    const handleImageArrayChange = (index, value) => {
        const newImages = [...(formData.images || [])];
        newImages[index] = value;
        setFormData(prev => ({...prev, images: newImages}));
    };
    
    const addImageField = () => {
        setFormData(prev => ({...prev, images: [...(prev.images || []), '']}));
    };

    const removeImageField = (index) => {
        const newImages = formData.images.filter((_, i) => i !== index);
        setFormData(prev => ({...prev, images: newImages}));
    };
    
    const handleImageChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploadStatus(`Enviando ${files.length} imagem(ns)...`);
        try {
            const uploadPromises = files.map(file => apiImageUploadService('/upload/image', file));
            const responses = await Promise.all(uploadPromises);
            const newImageUrls = responses.map(res => res.imageUrl);
            
            setFormData(prev => ({...prev, images: [...(prev.images || []), ...newImageUrls]}));
            setUploadStatus('Upload concluído com sucesso!');
            e.target.value = ''; 
            setTimeout(() => setUploadStatus(''), 3000);
        } catch (error) {
            setUploadStatus(`Erro no upload: ${error.message}`);
        }
    };
    
    const handleVariationChange = (index, field, value) => {
        const newVariations = [...formData.variations];
        newVariations[index][field] = value;
        setFormData(prev => ({ ...prev, variations: newVariations }));
    };
    
    const handleVariationImageUpload = async (index, e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploadingStatus(prev => ({ ...prev, [index]: 'Enviando...' }));
        try {
            const uploadPromises = files.map(file => apiImageUploadService('/upload/image', file));
            const responses = await Promise.all(uploadPromises);
            const newImageUrls = responses.map(res => res.imageUrl);
            
            const newVariations = [...formData.variations];
            const currentImages = newVariations[index].images || [];
            newVariations[index].images = [...currentImages, ...newImageUrls];
            setFormData(prev => ({ ...prev, variations: newVariations }));
            
            setUploadingStatus(prev => ({ ...prev, [index]: `${files.length} imagem(ns) enviada(s)!` }));
            e.target.value = '';
            setTimeout(() => setUploadingStatus(prev => ({ ...prev, [index]: '' })), 3000);
        } catch (error) {
            setUploadingStatus(prev => ({ ...prev, [index]: `Erro: ${error.message}` }));
        }
    };

    const addVariation = () => {
        setFormData(prev => ({
            ...prev,
            variations: [...(prev.variations || []), { color: '', size: '', stock: 0, images: [] }]
        }));
    };

    const removeVariation = (index) => {
        const newVariations = formData.variations.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, variations: newVariations }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const dataToSubmit = { ...formData };
        dataToSubmit.product_type = productType;

        // Correção de Fuso Horário
        if (dataToSubmit.sale_end_date) {
            const localDate = new Date(dataToSubmit.sale_end_date);
            dataToSubmit.sale_end_date = localDate.toISOString();
        }

        if (productType === 'perfume') {
            clothingFields.forEach(field => delete dataToSubmit[field.name]);
            dataToSubmit.variations = '[]';
            dataToSubmit.stock = parseInt(dataToSubmit.stock, 10) || 0;
        } else if (productType === 'clothing') {
            perfumeFields.forEach(field => delete dataToSubmit[field.name]);

            const colorImageMap = new Map();
            (dataToSubmit.variations || []).forEach(v => {
                if (v.color && !colorImageMap.has(v.color)) {
                    colorImageMap.set(v.color, v.images || []);
                }
            });

            const syncedVariations = (dataToSubmit.variations || []).map(v => ({
                ...v,
                images: v.color ? colorImageMap.get(v.color) : []
            }));

            dataToSubmit.variations = syncedVariations;
            
            const totalStock = (dataToSubmit.variations || []).reduce((sum, v) => sum + (parseInt(v.stock, 10) || 0), 0);
            dataToSubmit.stock = totalStock;
        }

        dataToSubmit.images = JSON.stringify(dataToSubmit.images?.filter(img => img && img.trim() !== '') || []);
        if (dataToSubmit.variations) {
            dataToSubmit.variations = JSON.stringify(dataToSubmit.variations);
        }
        
        delete dataToSubmit.images_upload; 

        onSave(dataToSubmit);
    };
    
    const availableColors = useMemo(() => [...new Set(categories.filter(c => c.type === 'color').map(c => c.name))], [categories]);
    const availableSizes = useMemo(() => [...new Set(categories.filter(c => c.type === 'size').map(c => c.name))], [categories]);

    // Lista Padrão de Cores
    const PREDEFINED_COLORS = [
        "Amarelo", "Azul", "Azul Marinho", "Bege", "Branco", "Cinza", 
        "Dourado", "Jeans", "Laranja", "Marrom", "Multicolorido", "Nude", 
        "Off-White", "Prata", "Prateado", "Preto", "Rosa", "Roxo", "Verde", "Vermelho", "Vinho"
    ];

    const allColors = useMemo(() => {
        const dbColors = categories.filter(c => c.type === 'color').map(c => c.name);
        return [...new Set([...PREDEFINED_COLORS, ...dbColors])].sort();
    }, [categories]);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-4 bg-gray-100 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Produto</label>
                <div className="flex gap-4">
                    <button type="button" onClick={() => setProductType('perfume')} className={`flex-1 p-3 rounded-md border-2 font-semibold flex items-center justify-center gap-2 ${productType === 'perfume' ? 'bg-amber-100 border-amber-500 text-amber-800' : 'bg-white border-gray-300 hover:border-amber-400'}`}>
                        <SparklesIcon className="h-5 w-5" /> Perfume
                    </button>
                    <button type="button" onClick={() => setProductType('clothing')} className={`flex-1 p-3 rounded-md border-2 font-semibold flex items-center justify-center gap-2 ${productType === 'clothing' ? 'bg-amber-100 border-amber-500 text-amber-800' : 'bg-white border-gray-300 hover:border-amber-400'}`}>
                        <ShirtIcon className="h-5 w-5" /> Roupa
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {commonFields.map(field => {
                    if (field.type === 'checkbox' || field.name === 'images' || field.name === 'images_upload') return null;

                    if (field.name === 'category') {
                         return (
                            <div key={field.name}>
                                <label className="block text-sm font-medium text-gray-700">{field.label}</label>
                                <select 
                                    name="category" 
                                    value={formData.category || ''} 
                                    onChange={handleChange} 
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white" 
                                    required={field.required}
                                >
                                    <option value="">Selecione...</option>
                                    {availableProductCategories.map(cat => <option key={cat.id} value={cat.filter}>{cat.name}</option>)}
                                </select>
                            </div>
                        );
                    }
                    if (field.name === 'brand') {
                        if (productType === 'perfume') {
                            return (
                                <div key={field.name}>
                                    <label className="block text-sm font-medium text-gray-700">{field.label}</label>
                                    <select
                                        name="brand"
                                        value={formData.brand || ''}
                                        onChange={handleChange}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white"
                                        required={field.required}
                                    >
                                        <option value="">Selecione...</option>
                                        {perfumeBrands.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>
                            )
                        } else {
                             return (
                                <div key={field.name}>
                                    <label className="block text-sm font-medium text-gray-700">{field.label}</label>
                                    <input
                                        type="text"
                                        name={field.name}
                                        value={formData[field.name] || ''}
                                        onChange={handleChange}
                                        list="brand-datalist"
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                        required={field.required}
                                    />
                                    <datalist id="brand-datalist">
                                        {brands.map(opt => <option key={opt} value={opt} />)}
                                    </datalist>
                                </div>
                            );
                        }
                    }
                   
                    if (field.type === 'textarea') {
                         return (
                            <div key={field.name} className="lg:col-span-3">
                                <label className="block text-sm font-medium text-gray-700">{field.label}</label>
                                <textarea name={field.name} value={formData[field.name] || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm h-24" required={field.required}></textarea>
                            </div>
                         )
                    }
                    
                    const isNameField = field.name === 'name';
                    if (field.name === 'sale_price') return null;
                    
                    return (
                        <div key={field.name} className={`${isNameField ? 'lg:col-span-3' : ''}`}>
                            <label className="block text-sm font-medium text-gray-700">{field.label}</label>
                            <input type={field.type} name={field.name} value={formData[field.name] || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required={field.required} step={field.step} />
                        </div>
                    );
                })}

                {/* --- ÁREA DE DESTAQUE PARA PROMOÇÃO --- */}
                <div className="lg:col-span-3 bg-yellow-50 border-2 border-yellow-200 rounded-lg p-5 space-y-4 shadow-sm">
                    <div className="flex items-center">
                        <input 
                            type="checkbox" 
                            name="is_on_sale" 
                            id="is_on_sale_checkbox" 
                            checked={!!formData['is_on_sale']} 
                            onChange={handleChange} 
                            className="h-5 w-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500 cursor-pointer" 
                        />
                        <label htmlFor="is_on_sale_checkbox" className="ml-2 text-base font-bold text-gray-800 cursor-pointer">Produto em Promoção?</label>
                    </div>
                    
                    {formData['is_on_sale'] && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }} 
                            animate={{ opacity: 1, height: 'auto' }} 
                            className="space-y-4"
                        >
                            {/* Seletor de Modo: Valor Fixo ou Porcentagem */}
                            <div className="flex gap-4 border-b border-yellow-200 pb-3">
                                <label className="flex items-center cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="promoMode" 
                                        value="fixed" 
                                        checked={promoMode === 'fixed'} 
                                        onChange={() => handlePromoModeChange('fixed')}
                                        className="h-4 w-4 text-amber-600 focus:ring-amber-500"
                                    />
                                    <span className="ml-2 text-sm font-medium text-gray-800">Definir Preço Fixo (R$)</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="promoMode" 
                                        value="percentage" 
                                        checked={promoMode === 'percentage'} 
                                        onChange={() => handlePromoModeChange('percentage')}
                                        className="h-4 w-4 text-amber-600 focus:ring-amber-500"
                                    />
                                    <span className="ml-2 text-sm font-medium text-gray-800">Definir Porcentagem (%)</span>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Campo de Porcentagem (Só ativo se o modo for 'percentage') */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-1">Desconto (%)</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            value={promoPercent} 
                                            onChange={handlePercentChange}
                                            disabled={promoMode !== 'percentage'}
                                            className={`block w-full pr-8 pl-3 py-2 border rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 ${promoMode !== 'percentage' ? 'bg-gray-200 text-gray-500 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-300'}`}
                                            min="0"
                                            max="100"
                                        />
                                        <span className="absolute right-3 top-2 text-gray-500">%</span>
                                    </div>
                                </div>

                                {/* Campo de Preço Promocional (Só editável se o modo for 'fixed') */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-1">Preço Final (R$)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-gray-500">R$</span>
                                        <input 
                                            type="number" 
                                            name="sale_price" 
                                            value={formData.sale_price || ''} 
                                            onChange={handleChange} 
                                            disabled={promoMode !== 'fixed'}
                                            className={`block w-full pl-8 pr-3 py-2 border rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 ${promoMode !== 'fixed' ? 'bg-gray-200 text-gray-500 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-300'}`}
                                            step="0.01" 
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-red-700 mb-1">Data/Hora Fim (Opcional)</label>
                                    <input 
                                        type="datetime-local" 
                                        name="sale_end_date" 
                                        value={formData.sale_end_date || ''} 
                                        onChange={handleChange} 
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 bg-white" 
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">
                                {promoMode === 'percentage' 
                                    ? "O preço final é calculado automaticamente com base na porcentagem." 
                                    : "Digite o valor final da promoção manualmente."}
                            </p>
                        </motion.div>
                    )}
                </div>

                <div className="lg:col-span-3 grid grid-cols-1 gap-4">
                    <div className="flex items-center pt-2">
                        <input type="checkbox" name="is_active" id="is_active_checkbox" checked={!!formData['is_active']} onChange={handleChange} className="h-5 w-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500" />
                        <label htmlFor="is_active_checkbox" className="ml-2 text-sm font-medium text-gray-700">Produto Ativo</label>
                    </div>
                </div>

            </div>
            
            <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
                <h3 className="font-semibold text-gray-800">Gerenciamento de Imagens Principais</h3>
                <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Fazer Upload de Novas Imagens</label>
                     <input type="file" multiple accept="image/*" ref={mainGalleryInputRef} onChange={handleImageChange} className="hidden" />
                     <input type="file" accept="image/*" capture="environment" ref={mainCameraInputRef} onChange={handleImageChange} className="hidden" />
                     <div className="flex gap-2">
                        <button type="button" onClick={() => mainGalleryInputRef.current.click()} className="w-1/2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md flex items-center justify-center gap-2"><UploadIcon className="h-5 w-5" /> Galeria</button>
                        <button type="button" onClick={() => mainCameraInputRef.current.click()} className="w-1/2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md flex items-center justify-center gap-2"><CameraIcon className="h-5 w-5" /> Câmera</button>
                     </div>
                     {uploadStatus && <p className={`text-sm mt-2 ${uploadStatus.startsWith('Erro') ? 'text-red-500' : 'text-green-500'}`}>{uploadStatus}</p>}
                </div>
                 <div>
                     <label className="block text-sm font-medium text-gray-700 mt-4">URLs das Imagens</label>
                     {(formData.images || []).map((img, index) => (
                        <div key={index} className="flex items-center space-x-2 mt-2">
                            <img src={img || 'https://placehold.co/40x40/eee/ccc?text=?'} alt="Thumbnail" className="w-10 h-10 object-cover rounded-md border" />
                            <input type="text" value={img} onChange={(e) => handleImageArrayChange(index, e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" placeholder={`URL da Imagem ${index + 1}`} />
                            <button type="button" onClick={() => removeImageField(index)} className="p-2 bg-red-100 text-red-600 rounded-md flex-shrink-0 hover:bg-red-200"><TrashIcon className="h-4 w-4"/></button>
                        </div>
                     ))}
                     <button type="button" onClick={addImageField} className="mt-3 text-sm text-blue-600 hover:text-blue-800">Adicionar URL manualmente</button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={productType}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                >
                    {productType === 'perfume' && perfumeFields.map(field => (
                        <div key={field.name}>
                            <label className="block text-sm font-medium text-gray-700">{field.label}</label>
                            {field.type === 'textarea' ? (
                                <textarea name={field.name} value={formData[field.name] || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm h-24" required={field.required}></textarea>
                            ) : (
                            <input type={field.type} name={field.name} value={formData[field.name] || ''} onChange={handleChange} onBlur={field.name === 'volume' ? handleVolumeBlur : null} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required={field.required} />
                            )}
                        </div>
                    ))}
                    {productType === 'clothing' && clothingFields.map(field => {
                        if (field.name === 'variations') {
                             const seenColors = new Set();
                            return (
                                <div key={field.name} className="p-4 border rounded-lg bg-gray-50 space-y-3">
                                    <h3 className="font-semibold text-gray-800">{field.label}</h3>
                                    {(formData.variations || []).map((v, i) => {
                                        let isFirst = false;
                                        if (v.color && !seenColors.has(v.color)) {
                                            seenColors.add(v.color);
                                            isFirst = true;
                                        }
                                        return (
                                            <VariationInputRow 
                                                key={i} 
                                                variation={v} 
                                                index={i} 
                                                onVariationChange={handleVariationChange}
                                                onRemoveVariation={removeVariation}
                                                availableColors={allColors} // Usa a lista completa de cores padrão
                                                availableSizes={availableSizes}
                                                onImageUpload={(e) => handleVariationImageUpload(i, e)}
                                                uploadStatus={uploadingStatus[i]}
                                                isFirstOfColor={isFirst}
                                            />
                                        )
                                    })}
                                    <button type="button" onClick={addVariation} className="w-full text-sm text-blue-600 hover:text-blue-800 border-dashed border-2 p-2 rounded-md hover:border-blue-500">
                                        + Adicionar Variação
                                    </button>
                                </div>
                            );
                        }
                        return (
                            <div key={field.name}>
                                <label className="block text-sm font-medium text-gray-700">{field.label}</label>
                                <textarea name={field.name} value={formData[field.name] || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm h-24" required={field.required}></textarea>
                            </div>
                        );
                    })}
                </motion.div>
            </AnimatePresence>

            <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-200 rounded-md hover:bg-gray-300 font-semibold">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 font-semibold">Salvar</button>
            </div>
        </form>
    );
};

const FileUploadArea = ({ onFileSelect }) => {
    const [dragging, setDragging] = useState(false);
    const [fileName, setFileName] = useState('');
    const fileInputRef = useRef(null);

    const handleDragEvents = (e, isDragging) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(isDragging);
    };

    const handleDrop = (e) => {
        handleDragEvents(e, false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            setFileName(files[0].name);
            onFileSelect(files[0]);
        }
    };
    
    const handleFileChange = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setFileName(files[0].name);
            onFileSelect(files[0]);
        }
    };
    
    const triggerFileSelect = () => fileInputRef.current.click();

    return (
        <div 
            className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${dragging ? 'border-amber-500 bg-amber-50' : 'border-gray-300 hover:border-gray-400'}`}
            onDragEnter={(e) => handleDragEvents(e, true)}
            onDragOver={(e) => handleDragEvents(e, true)}
            onDragLeave={(e) => handleDragEvents(e, false)}
            onDrop={handleDrop}
            onClick={triggerFileSelect}
        >
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv"
                onChange={handleFileChange}
            />
            <UploadIcon className="h-10 w-10 mx-auto text-gray-400 mb-2"/>
            {fileName ? (
                <div>
                    <p className="font-semibold text-gray-800">{fileName}</p>
                    <p className="text-xs text-gray-500">Clique ou arraste outro arquivo para substituir</p>
                </div>
            ) : (
                <p className="text-gray-600">Arraste e solte o arquivo CSV aqui, ou <span className="text-amber-600 font-semibold">clique para selecionar</span>.</p>
            )}
        </div>
    );
}

const DownloadTemplateButton = ({ productType }) => {
    const handleDownload = () => {
        let headers, exampleRow, filename;
        if (productType === 'perfume') {
            headers = "name,brand,category,price,sale_price,stock,images,description,notes,how_to_use,ideal_for,volume,weight,width,height,length,is_active,is_on_sale,product_type";
            exampleRow = "Meu Perfume,O Boticário,Perfumes Feminino,199.90,149.90,50,https://example.com/img1.png,Descrição do meu perfume,Topo: Limão\\nCorpo: Jasmim,Aplicar na pele,\"Para todos os momentos, dia e noite\",100ml,0.4,12,18,12,1,1,perfume";
            filename = "modelo_perfumes.csv";
        } else { // clothing
            headers = "name,brand,category,price,sale_price,images,description,variations,size_guide,care_instructions,weight,width,height,length,is_active,is_on_sale,product_type";
            exampleRow = "Minha Camisa,Minha Marca,Blusas,99.90,79.90,[]\t,Descrição da camisa,\"[{\\\"color\\\":\\\"Azul\\\",\\\"size\\\":\\\"M\\\",\\\"stock\\\":10,\\\"images\\\":[\\\"url1\\\"]},{\\\"color\\\":\\\"Preto\\\",\\\"size\\\":\\\"M\\\",\\\"stock\\\":5,\\\"images\\\":[]}]\",<p>Busto: 90cm</p>,Lavar a mão,0.3,30,40,2,1,1,clothing";
            filename = "modelo_roupas.csv";
        }
        
        const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + exampleRow;
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <button onClick={handleDownload} className="text-sm text-blue-600 hover:text-blue-800 underline">
            Baixar modelo CSV de {productType === 'perfume' ? 'Perfumes' : 'Roupas'}
        </button>
    );
};

const QuickStockUpdateModal = ({ item, onClose, onSave }) => {
    const [stock, setStock] = useState(item.stock);
    const [isSaving, setIsSaving] = useState(false);
    const notification = useNotification();

    const handleSave = async () => {
       // console.log('QuickStockUpdateModal - Item recebido:', JSON.stringify(item, null, 2)); // Removido ou comentado
        setIsSaving(true);
        try {
            const payload = {
            productId: item.id,
            newStock: parseInt(stock, 10),
            // CORREÇÃO: Certifica que o objeto `variation` está sendo enviado corretamente
            // O `item` recebido já contém a estrutura correta vinda do `lowStockProducts`
            variation: item.product_type === 'clothing' ? item.variation : null
        };
        // console.log('QuickStockUpdateModal - Payload a ser enviado:', JSON.stringify(payload, null, 2)); // Removido ou comentado
            // CORREÇÃO: Removido o "/api" duplicado.
            await apiService('/products/stock-update', 'PUT', payload);
            notification.show('Estoque atualizado com sucesso!');
            onSave(); // Fecha o modal e atualiza a lista
        } catch (error) {
            notification.show(`Erro ao atualizar estoque: ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Atualização Rápida de Estoque" size="sm">
            <div className="space-y-4">
                <p className="font-semibold text-lg">{item.name}</p>
                <div className="flex items-center gap-4">
                    <label className="font-medium text-gray-700">Novo Estoque:</label>
                    <input
                        type="number"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                    />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 disabled:bg-gray-400 flex items-center justify-center"
                    >
                        {isSaving ? <SpinnerIcon /> : 'Salvar'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const AdminProducts = ({ onNavigate }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const confirmation = useConfirmation();
  const notification = useNotification();
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importMessage, setImportMessage] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  
  // Estados para Promoção em Massa
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isBulkPromoModalOpen, setIsBulkPromoModalOpen] = useState(false);
  const [bulkDiscount, setBulkDiscount] = useState(10);
  const [isBulkLimitedTime, setIsBulkLimitedTime] = useState(false);
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [isApplyingBulk, setIsApplyingBulk] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [uniqueBrands, setUniqueBrands] = useState([]);
  const [uniqueCategories, setUniqueCategories] = useState([]);
  const [productType, setProductType] = useState('perfume');
  
  const LOW_STOCK_THRESHOLD = 5;

  // Componente interno para o contador do admin
  const AdminCountdown = ({ endDate }) => {
      const [timeLeft, setTimeLeft] = useState('');
      
      useEffect(() => {
          const calculate = () => {
              if (!endDate) {
                  setTimeLeft('');
                  return;
              }
              const diff = new Date(endDate).getTime() - new Date().getTime();
              
              if (diff <= 0) {
                  setTimeLeft('Expirado');
                  return;
              }
              
              const d = Math.floor(diff / (1000 * 60 * 60 * 24));
              const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
              const m = Math.floor((diff / 1000 / 60) % 60);
              
              if (d > 0) {
                  setTimeLeft(`${d}d ${h}h`);
              } else {
                  setTimeLeft(`${h}h ${m}m`);
              }
          };
          calculate();
          const timer = setInterval(calculate, 60000); 
          return () => clearInterval(timer);
      }, [endDate]);

      if (!timeLeft) return null;
      if (timeLeft === 'Expirado') return <span className="text-gray-500 text-[10px] font-bold">Expirado</span>;
      return <span className="text-red-600 font-bold text-[10px] animate-pulse">{timeLeft}</span>;
  };

  const fetchProducts = useCallback(() => {
    apiService(`/products/all`)
        .then(data => {
            setProducts(data);
            const brands = [...new Set(data.map(p => p.brand).filter(b => b))];
            
            const categorySet = new Set();
            data.forEach(p => {
                if (p.category) categorySet.add(JSON.stringify({ name: p.category, type: 'product' }));
                if (p.variations) {
                    try {
                        const variations = JSON.parse(p.variations);
                        variations.forEach(v => {
                            if (v.color) categorySet.add(JSON.stringify({ name: v.color, type: 'color' }));
                            if (v.size) categorySet.add(JSON.stringify({ name: v.size, type: 'size' }));
                        });
                    } catch (e) { console.error("Erro ao parsear variações", p.variations, e); }
                }
            });

            setUniqueBrands(brands);
            setUniqueCategories(Array.from(categorySet).map(item => JSON.parse(item)));
        })
        .catch(err => console.error("Falha ao buscar produtos:", err));
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const lowercasedSearch = searchTerm.toLowerCase();
    const filtered = products.filter(p =>
        !lowercasedSearch ||
        p.name.toLowerCase().includes(lowercasedSearch) ||
        p.brand.toLowerCase().includes(lowercasedSearch) ||
        p.category.toLowerCase().includes(lowercasedSearch)
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  const handleOpenModal = (product = null) => {
    setEditingProduct(product);
    setProductType(product ? product.product_type : 'perfume');
    setIsModalOpen(true);
  };
  
  const handleSave = async (formData) => {
      try {
        if (editingProduct) {
            await apiService(`/products/${editingProduct.id}`, 'PUT', formData);
            notification.show('Produto atualizado com sucesso!');
        } else {
            await apiService('/products', 'POST', formData);
            notification.show('Produto criado com sucesso!');
        }
        fetchProducts();
        setIsModalOpen(false);
      } catch (error) {
          notification.show(`Erro ao salvar produto: ${error.message}`, 'error');
      }
  };

  const handleDelete = (id) => {
      confirmation.show(
          "Tem certeza que deseja deletar este produto?", 
          async () => {
              try {
                await apiService(`/products/${id}`, 'DELETE');
                fetchProducts();
                notification.show('Produto deletado com sucesso.');
              } catch(error) {
                notification.show(`Erro ao deletar produto: ${error.message}`, 'error');
              }
          },
          { requiresAuth: true, confirmText: 'Deletar', confirmColor: 'bg-red-600 hover:bg-red-700' }
      );
  };

  // --- LÓGICA DE PROMOÇÃO EM MASSA ---
  const handleSelectProduct = (productId) => {
    setSelectedProducts(prevSelected => {
        if (prevSelected.includes(productId)) {
            return prevSelected.filter(id => id !== productId);
        } else {
            return [...prevSelected, productId];
        }
    });
  };

  const handleSelectAll = (e) => {
      if (e.target.checked) {
          const allProductIds = filteredProducts.map(p => p.id);
          setSelectedProducts(allProductIds);
      } else {
          setSelectedProducts([]);
      }
  };

  const handleBulkPromotion = async (e) => {
      e.preventDefault();
      if (isBulkLimitedTime && !bulkEndDate) {
          notification.show("Por favor, selecione a data de término da promoção.", "error");
          return;
      }
      
      setIsApplyingBulk(true);
      try {
          // CORREÇÃO DE FUSO HORÁRIO: Envia a data em ISO UTC
          const formattedEndDate = isBulkLimitedTime ? new Date(bulkEndDate).toISOString() : null;

          const result = await apiService('/products/bulk-promo', 'PUT', {
              productIds: selectedProducts,
              discountPercentage: bulkDiscount,
              isLimitedTime: isBulkLimitedTime,
              saleEndDate: formattedEndDate
          });
          
          notification.show(result.message);
          fetchProducts();
          setIsBulkPromoModalOpen(false);
          setSelectedProducts([]); 
          setBulkDiscount(10);
          setBulkEndDate('');
          setIsBulkLimitedTime(false);
      } catch (error) {
          notification.show(`Erro ao aplicar promoção: ${error.message}`, 'error');
      } finally {
          setIsApplyingBulk(false);
      }
  };

  return (
    <div>
        {/* MODAL DE PROMOÇÃO EM MASSA */}
        <AnimatePresence>
            {isBulkPromoModalOpen && (
                <Modal isOpen={isBulkPromoModalOpen} onClose={() => setIsBulkPromoModalOpen(false)} title={`Aplicar Promoção em ${selectedProducts.length} Produtos`}>
                    <form onSubmit={handleBulkPromotion} className="space-y-6">
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                            <p className="text-sm text-yellow-800">
                                <strong>Atenção:</strong> Isso atualizará o preço promocional de todos os produtos selecionados baseado no desconto escolhido sobre o preço original atual.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Porcentagem de Desconto (%)</label>
                            <input 
                                type="number" 
                                min="1" 
                                max="99" 
                                value={bulkDiscount} 
                                onChange={(e) => setBulkDiscount(e.target.value)} 
                                className="w-full p-2 border border-gray-300 rounded-md text-lg font-bold text-gray-800"
                            />
                        </div>

                        <div className="flex items-center space-x-3 p-3 border rounded-md">
                            <input 
                                type="checkbox" 
                                id="bulkTimeLimit" 
                                checked={isBulkLimitedTime} 
                                onChange={(e) => setIsBulkLimitedTime(e.target.checked)} 
                                className="h-5 w-5 text-amber-600 rounded"
                            />
                            <label htmlFor="bulkTimeLimit" className="text-gray-800 font-medium cursor-pointer">Definir Tempo Limitado?</label>
                        </div>

                        {isBulkLimitedTime && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                <label className="block text-sm font-bold text-red-600 mb-1">Data/Hora de Término</label>
                                <input 
                                    type="datetime-local" 
                                    value={bulkEndDate} 
                                    onChange={(e) => setBulkEndDate(e.target.value)} 
                                    className="w-full p-2 border border-red-300 rounded-md focus:ring-red-500"
                                    required={isBulkLimitedTime}
                                />
                                <p className="text-xs text-gray-500 mt-1">Os produtos voltarão ao preço original automaticamente após esta data.</p>
                            </motion.div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <button type="button" onClick={() => setIsBulkPromoModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
                            <button type="submit" disabled={isApplyingBulk} className="px-6 py-2 bg-amber-500 text-black font-bold rounded-md hover:bg-amber-400 flex items-center gap-2">
                                {isApplyingBulk ? <SpinnerIcon className="h-5 w-5"/> : <SaleIcon className="h-5 w-5"/>}
                                Aplicar Desconto
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </AnimatePresence>

        <AnimatePresence>
            {isModalOpen && (
                <Modal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    title={editingProduct ? 'Editar Produto' : 'Adicionar Novo Produto'}
                    size="3xl"
                >
                    <ProductForm
                        item={editingProduct} 
                        onSave={handleSave} 
                        onCancel={() => setIsModalOpen(false)} 
                        productType={productType}
                        setProductType={setProductType}
                        brands={uniqueBrands}
                        categories={uniqueCategories}
                    />
                </Modal>
            )}
        </AnimatePresence>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold">Gerenciar Produtos</h1>
            <div className="flex flex-wrap gap-2">
                {selectedProducts.length > 0 && (
                    <>
                        <button onClick={() => setIsBulkPromoModalOpen(true)} className="bg-amber-500 text-black px-4 py-2 rounded-md hover:bg-amber-400 flex items-center space-x-2 font-bold animate-pulse">
                            <SaleIcon className="h-5 w-5"/> <span>Aplicar Promoção ({selectedProducts.length})</span>
                        </button>
                    </>
                )}
                <button onClick={() => handleOpenModal()} className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900 flex items-center space-x-2">
                    <PlusIcon className="h-5 w-5"/> <span>Novo Produto</span>
                </button>
            </div>
        </div>
        
        <div className="mb-6">
            <input 
                type="text" 
                placeholder="Pesquisar por nome, marca ou categoria..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
        </div>

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="hidden md:block">
                <table className="w-full text-left">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-4 w-4">
                                <input type="checkbox" onChange={handleSelectAll} checked={filteredProducts.length > 0 && selectedProducts.length === filteredProducts.length} />
                            </th>
                            <th className="p-4">Produto</th>
                            <th className="p-4">Tipo</th>
                            <th className="p-4">Preço</th>
                            <th className="p-4">Promoção</th>
                            <th className="p-4">Estoque</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(p => {
                            // Correção na verificação de tempo limitado
                            const isTimeLimited = p.is_on_sale && p.sale_end_date && new Date(p.sale_end_date).getTime() > new Date().getTime();
                            
                            return (
                                <tr key={p.id} className={`border-b ${selectedProducts.includes(p.id) ? 'bg-amber-50' : ''} ${p.stock < LOW_STOCK_THRESHOLD ? 'bg-red-50' : ''}`}>
                                    <td className="p-4"><input type="checkbox" checked={selectedProducts.includes(p.id)} onChange={() => handleSelectProduct(p.id)} /></td>
                                    <td className="p-4 flex items-center">
                                        <div className="w-10 h-10 mr-4 flex-shrink-0 bg-gray-200 rounded-md flex items-center justify-center">
                                            <img src={getFirstImage(p.images, 'https://placehold.co/40x40/222/fff?text=Img')} className="max-h-full max-w-full object-contain" alt={p.name}/>
                                        </div>
                                        <div>
                                            <p className="font-semibold">{p.name}</p>
                                            <p className="text-xs text-gray-500">{p.brand}</p>
                                        </div>
                                    </td>
                                    <td className="p-4 capitalize">{p.product_type}</td>
                                    <td className="p-4">
                                        {p.is_on_sale && p.sale_price > 0 ? (
                                            <div className="flex flex-col">
                                                <span className="text-red-600 font-bold">R$ {Number(p.sale_price).toFixed(2)}</span>
                                                <span className="text-gray-500 text-xs line-through">R$ {Number(p.price).toFixed(2)}</span>
                                            </div>
                                        ) : (
                                            <span>R$ {Number(p.price).toFixed(2)}</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {p.is_on_sale ? (
                                            <div className="flex flex-col items-start gap-1">
                                                <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Ativa</span>
                                                {isTimeLimited ? (
                                                    <div className="flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                                        <ClockIcon className="h-3 w-3 text-red-500"/>
                                                        <AdminCountdown endDate={p.sale_end_date} />
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-[10px]">Sem data fim</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className={`p-4 font-bold ${p.stock < LOW_STOCK_THRESHOLD ? 'text-red-600' : ''}`}>
                                        {p.stock < LOW_STOCK_THRESHOLD && <ExclamationIcon className="h-4 w-4 inline-block mr-1 text-yellow-500"/>}
                                        {p.stock}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${p.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>{p.is_active ? 'Ativo' : 'Inativo'}</span>
                                    </td>
                                    <td className="p-4 space-x-2"><button onClick={() => handleOpenModal(p)}><EditIcon className="h-5 w-5"/></button><button onClick={() => handleDelete(p.id)}><TrashIcon className="h-5 w-5"/></button></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            {/* VERSÃO MOBILE DO ADMIN */}
            <div className="md:hidden space-y-4 p-4">
                {filteredProducts.map(p => {
                    const isTimeLimited = p.is_on_sale && p.sale_end_date && new Date(p.sale_end_date).getTime() > new Date().getTime();
                    return (
                        <div key={p.id} className={`bg-white border rounded-lg p-4 shadow-sm ${selectedProducts.includes(p.id) ? 'border-amber-400 bg-amber-50' : ''}`}>
                            <div className="flex justify-between items-start">
                                 <div className="flex items-center">
                                    <input type="checkbox" checked={selectedProducts.includes(p.id)} onChange={() => handleSelectProduct(p.id)} className="mr-4 h-5 w-5"/>
                                    <img src={getFirstImage(p.images, 'https://placehold.co/40x40/222/fff?text=Img')} className="h-12 w-12 object-contain mr-3 bg-gray-100 rounded"/>
                                    <div>
                                        <p className="font-bold">{p.name}</p>
                                        <p className="text-sm text-gray-500">{p.brand}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-4 text-sm border-t pt-4">
                                 <div>
                                    <strong className="text-gray-500 block">Preço</strong> 
                                    {p.is_on_sale && p.sale_price > 0 ? (
                                        <>
                                            <span className="text-red-600 font-bold block">R$ {Number(p.sale_price).toFixed(2)}</span>
                                            {isTimeLimited && (
                                                <div className="flex items-center gap-1 mt-1">
                                                    <ClockIcon className="h-3 w-3 text-red-500"/>
                                                    <AdminCountdown endDate={p.sale_end_date} />
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <span>R$ {Number(p.price).toFixed(2)}</span>
                                    )}
                                 </div>
                                 <div className={`font-bold ${p.stock < LOW_STOCK_THRESHOLD ? 'text-red-600' : ''}`}>
                                    <strong className="text-gray-500 block font-normal">Estoque</strong> 
                                    {p.stock}
                                 </div>
                            </div>
                             <div className="flex justify-end space-x-2 mt-4 pt-2 border-t">
                                <button onClick={() => handleOpenModal(p)} className="p-2 text-blue-600"><EditIcon className="h-5 w-5"/></button>
                                <button onClick={() => handleDelete(p.id)} className="p-2 text-red-600"><TrashIcon className="h-5 w-5"/></button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
  )
};
const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const notification = useNotification();

    const fetchUsers = useCallback(() => {
        setIsLoading(true);
        apiService('/users')
            .then(setUsers)
            .catch(err => notification.show(`Erro ao buscar usuários: ${err.message}`, 'error'))
            .finally(() => setIsLoading(false));
    }, [notification]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);
    
    const handleOpenDetails = (user) => {
        setSelectedUser(user);
        setIsDetailModalOpen(true);
    };

    return (
        <div>
             <AnimatePresence>
                {isDetailModalOpen && (
                    <UserDetailsModal 
                        user={selectedUser} 
                        onClose={() => setIsDetailModalOpen(false)}
                        onUserUpdate={fetchUsers} // Passa a função para recarregar a lista
                    />
                )}
            </AnimatePresence>
            <h1 className="text-3xl font-bold mb-6">Gerenciar Usuários</h1>
            
            {isLoading ? (
                <div className="flex justify-center py-20"><SpinnerIcon className="h-8 w-8 text-amber-500" /></div>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-4 font-semibold">Nome</th>
                                    <th className="p-4 font-semibold">Email</th>
                                    <th className="p-4 font-semibold">Função</th>
                                    <th className="p-4 font-semibold">Status</th>
                                    <th className="p-4 font-semibold">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} className="border-b last:border-b-0 hover:bg-gray-50">
                                        <td className="p-4 font-medium">{u.name}</td>
                                        <td className="p-4 text-gray-600">{u.email}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-800'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {u.status === 'active' ? 'Ativo' : 'Bloqueado'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <button onClick={() => handleOpenDetails(u)} className="p-2 text-gray-500 hover:text-blue-600" title="Ver Detalhes">
                                                <EyeIcon className="h-5 w-5"/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4 p-4">
                        {users.map(u => (
                            <div key={u.id} className="bg-white border rounded-lg p-4 shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold">{u.name}</p>
                                        <p className="text-sm text-gray-600">{u.email}</p>
                                    </div>
                                    <button onClick={() => handleOpenDetails(u)} className="p-2 text-gray-500 hover:text-blue-600" title="Ver Detalhes">
                                        <EyeIcon className="h-5 w-5"/>
                                    </button>
                                </div>
                                <div className="flex items-center justify-start gap-4 mt-4 pt-4 border-t">
                                    <div>
                                        <strong className="text-gray-500 block text-xs">Função</strong>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-800'}`}>
                                            {u.role}
                                        </span>
                                    </div>
                                    <div>
                                        <strong className="text-gray-500 block text-xs">Status</strong>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {u.status === 'active' ? 'Ativo' : 'Bloqueado'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const CouponCountdown = ({ createdAt, validityDays }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (!validityDays || !createdAt) {
            setTimeLeft('Permanente');
            return;
        }

        const interval = setInterval(() => {
            const expirationDate = new Date(new Date(createdAt).getTime() + validityDays * 24 * 60 * 60 * 1000);
            const now = new Date();
            const difference = expirationDate - now;

            if (difference <= 0) {
                setTimeLeft('Expirado');
                clearInterval(interval);
                return;
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((difference / 1000 / 60) % 60);
            const seconds = Math.floor((difference / 1000) % 60);
            
            let displayString = '';
            if (days > 0) displayString += `${days}d `;
            displayString += `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            
            setTimeLeft(displayString);
        }, 1000);

        return () => clearInterval(interval);
    }, [createdAt, validityDays]);

    const colorClass = timeLeft === 'Expirado' ? 'text-red-500' : 'text-green-600';

    return <span className={`font-mono text-sm ${colorClass}`}>{timeLeft}</span>;
};

const AdminCoupons = () => {
    const [coupons, setCoupons] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const confirmation = useConfirmation();
    const notification = useNotification();

    const fetchCoupons = useCallback(() => {
        apiService('/coupons').then(data => {
            setCoupons(data.sort((a,b) => b.id - a.id));
        }).catch(err=>console.error(err));
    }, []);

    useEffect(() => { fetchCoupons() }, [fetchCoupons]);

    const handleOpenModal = (coupon = null) => {
        setEditingCoupon(coupon);
        setIsModalOpen(true);
    };

    const handleSave = async (formData) => {
        try {
            if (editingCoupon) {
                await apiService(`/coupons/${editingCoupon.id}`, 'PUT', formData);
                notification.show('Cupom atualizado!');
            } else {
                await apiService('/coupons', 'POST', formData);
                notification.show('Cupom criado!');
            }
            fetchCoupons();
            setIsModalOpen(false);
        } catch (error) {
            notification.show(`Erro: ${error.message}`, 'error');
        }
    };
    
    const handleDelete = (id) => {
        confirmation.show("Tem certeza que deseja deletar este cupom?", async () => {
            try {
                await apiService(`/coupons/${id}`, 'DELETE');
                fetchCoupons();
                notification.show('Cupom deletado.');
            } catch(error) {
                notification.show(`Erro: ${error.message}`, 'error');
            }
        });
    }

    const couponFields = [
        { name: 'code', label: 'Código do Cupom', type: 'text', required: true, placeholder: 'Ex: PROMO10' },
        { name: 'type', label: 'Tipo de Desconto', type: 'select', options: [{value: 'percentage', label: 'Porcentagem (%)'}, {value: 'fixed', label: 'Valor Fixo (R$)'}, {value: 'free_shipping', label: 'Frete Grátis'}]},
        { name: 'value', label: 'Valor do Desconto', type: 'number', step: '0.01', required: false, placeholder: 'Ex: 10 para 10% ou R$10.00' },
        { name: 'validity_days', label: 'Dias de Validade', type: 'number', required: false, placeholder: 'Deixe em branco para ser permanente' },
        { name: 'is_first_purchase', label: 'Apenas para a primeira compra?', type: 'checkbox' },
        { name: 'is_single_use_per_user', label: 'Uso único por usuário?', type: 'checkbox' },
        { name: 'is_active', label: 'Ativo (pronto para uso)', type: 'checkbox' },
    ];
    
    return (
        <div>
            <AnimatePresence>
                {isModalOpen && (
                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCoupon ? 'Editar Cupom' : 'Adicionar Cupom'}>
                        <AdminCrudForm item={editingCoupon} onSave={handleSave} onCancel={() => setIsModalOpen(false)} fieldsConfig={couponFields} />
                    </Modal>
                )}
            </AnimatePresence>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold">Gerenciar Cupons</h1>
                <button onClick={() => handleOpenModal()} className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900 flex items-center space-x-2 flex-shrink-0"><PlusIcon className="h-5 w-5"/> <span>Novo Cupom</span></button>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="hidden md:block">
                    <table className="w-full text-left">
                         <thead className="bg-gray-100">
                             <tr>
                                <th className="p-4">Código</th>
                                <th className="p-4">Tipo</th>
                                <th className="p-4">Valor</th>
                                <th className="p-4">1ª Compra</th>
                                <th className="p-4">Uso Único</th>
                                <th className="p-4">Validade</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Ações</th>
                             </tr>
                        </thead>
                         <tbody>
                            {coupons.map(c => (
                                <tr key={c.id} className="border-b">
                                    <td className="p-4 font-mono text-sm font-semibold">{c.code}</td>
                                    <td className="p-4 capitalize">{c.type.replace('_', ' ')}</td>
                                    <td className="p-4">{c.type === 'free_shipping' ? 'Grátis' : (c.type === 'percentage' ? `${c.value}%` : `R$ ${Number(c.value).toFixed(2)}`)}</td>
                                    <td className="p-4">{c.is_first_purchase ? 'Sim' : 'Não'}</td>
                                    <td className="p-4">{c.is_single_use_per_user ? 'Sim' : 'Não'}</td>
                                    <td className="p-4"><CouponCountdown createdAt={c.created_at} validityDays={c.validity_days} /></td>
                                    <td className="p-4"><span className={`px-2 py-1 text-xs rounded-full ${c.is_active ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>{c.is_active ? 'Ativo' : 'Inativo'}</span></td>
                                    <td className="p-4 space-x-2"><button onClick={() => handleOpenModal(c)}><EditIcon className="h-5 w-5"/></button><button onClick={() => handleDelete(c.id)}><TrashIcon className="h-5 w-5"/></button></td>
                                </tr>
                            ))}
                         </tbody>
                    </table>
                </div>
                 <div className="md:hidden space-y-4 p-4">
                    {coupons.map(c => (
                         <div key={c.id} className="bg-white border rounded-lg p-4 shadow-sm">
                            <div className="flex justify-between items-start">
                                <span className="font-mono font-bold">{c.code}</span>
                                <span className={`px-2 py-1 text-xs rounded-full ${c.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{c.is_active ? 'Ativo' : 'Inativo'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-sm border-t pt-4">
                                 <div><strong className="text-gray-500 block">Tipo</strong> <span className="capitalize">{c.type.replace('_', ' ')}</span></div>
                                 <div><strong className="text-gray-500 block">Valor</strong> {c.type === 'free_shipping' ? 'Grátis' : (c.type === 'percentage' ? `${c.value}%` : `R$ ${Number(c.value).toFixed(2)}`)}</div>
                                 <div><strong className="text-gray-500 block">1ª Compra</strong> {c.is_first_purchase ? 'Sim' : 'Não'}</div>
                                 <div><strong className="text-gray-500 block">Uso Único</strong> {c.is_single_use_per_user ? 'Sim' : 'Não'}</div>
                                 <div className="col-span-2"><strong className="text-gray-500 block">Validade Restante</strong> <CouponCountdown createdAt={c.created_at} validityDays={c.validity_days} /></div>
                            </div>
                             <div className="flex justify-end space-x-2 mt-4 pt-2 border-t">
                                <button onClick={() => handleOpenModal(c)} className="p-2 text-blue-600"><EditIcon className="h-5 w-5"/></button>
                                <button onClick={() => handleDelete(c.id)} className="p-2 text-red-600"><TrashIcon className="h-5 w-5"/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const AdminRefunds = ({ onNavigate }) => {
    const [refunds, setRefunds] = useState([]);
    const [filteredRefunds, setFilteredRefunds] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRefund, setSelectedRefund] = useState(null);
    const [isDenyModalOpen, setIsDenyModalOpen] = useState(false);
    const [denyReason, setDenyReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const notification = useNotification();
    const confirmation = useConfirmation();

    const fetchRefunds = useCallback(() => {
        setIsLoading(true);
        apiService('/refunds')
            .then(data => {
                setRefunds(data);
                setFilteredRefunds(data);
            })
            .catch(err => notification.show(`Erro ao buscar reembolsos: ${err.message}`, 'error'))
            .finally(() => setIsLoading(false));
    }, [notification]);

    useEffect(() => {
        fetchRefunds();
    }, [fetchRefunds]);

    const handleApprove = (refund) => {
        confirmation.show(
            `Tem certeza que deseja aprovar e processar o reembolso de R$ ${Number(refund.amount).toFixed(2)} para o pedido #${refund.order_id}? Esta ação é irreversível.`,
            async () => {
                try {
                    const result = await apiService(`/refunds/${refund.id}/approve`, 'POST');
                    notification.show(result.message);
                    fetchRefunds();
                } catch (error) {
                    notification.show(`Erro ao aprovar: ${error.message}`, 'error');
                }
            },
            { requiresAuth: true, confirmText: 'Aprovar e Processar', confirmColor: 'bg-red-600 hover:bg-red-700' }
        );
    };

    const handleDeny = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            const result = await apiService(`/refunds/${selectedRefund.id}/deny`, 'POST', { reason: denyReason });
            notification.show(result.message);
            setIsDenyModalOpen(false);
            setDenyReason('');
            fetchRefunds();
        } catch (error) {
            notification.show(`Erro ao negar: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusChip = (status) => {
        const statuses = {
            'pending_approval': { text: 'Pendente', class: 'bg-yellow-100 text-yellow-800' },
            'approved': { text: 'Aprovado', class: 'bg-blue-100 text-blue-800' },
            'denied': { text: 'Negado', class: 'bg-red-100 text-red-800' },
            'processed': { text: 'Processado', class: 'bg-green-100 text-green-800' },
            'failed': { text: 'Falhou', class: 'bg-gray-200 text-gray-800' }
        };
        const s = statuses[status] || { text: 'Desconhecido', class: 'bg-gray-200 text-gray-800' };
        return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${s.class}`}>{s.text}</span>;
    };
    
    // Função para extrair o método de pagamento
    const getPaymentMethodName = (method, details) => {
        if (method === 'mercadopago') {
            try {
                const parsedDetails = JSON.parse(details);
                if (parsedDetails.method === 'credit_card') return 'Cartão de Crédito';
                if (parsedDetails.method === 'pix') return 'Pix';
                if (parsedDetails.method === 'boleto') return 'Boleto';
            } catch (e) { /* cai para o fallback */ }
        }
        return method?.replace('_', ' ') || 'N/A';
    };

    return (
        <div>
            <AnimatePresence>
                {isDenyModalOpen && selectedRefund && (
                     <Modal isOpen={true} onClose={() => setIsDenyModalOpen(false)} title={`Negar Reembolso #${selectedRefund.id}`}>
                        <form onSubmit={handleDeny}>
                            <label className="block text-sm font-medium text-gray-700">Por favor, informe o motivo da negação (será registrado internamente):</label>
                            <textarea value={denyReason} onChange={e => setDenyReason(e.target.value)} required rows="4" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsDenyModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
                                <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-gray-800 text-white rounded-md flex items-center gap-2 disabled:bg-gray-400">
                                    {isProcessing && <SpinnerIcon className="h-5 w-5" />}
                                    Confirmar Negação
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>

            <h1 className="text-3xl font-bold mb-6">Gerenciar Reembolsos</h1>
            
            {isLoading ? (
                <div className="flex justify-center py-20"><SpinnerIcon className="h-8 w-8 text-amber-500" /></div>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-4">Pedido</th>
                                    <th className="p-4">Cliente</th>
                                    <th className="p-4">Data Pedido</th>
                                    <th className="p-4">Pagamento</th>
                                    <th className="p-4">Data Solicitação</th>
                                    <th className="p-4">Valor</th>
                                    <th className="p-4 w-1/4">Motivo</th>
                                    <th className="p-4">Solicitante</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRefunds.map(r => (
                                    <tr key={r.id} className="border-b">
                                        <td className="p-4 font-mono">#{r.order_id}</td>
                                        <td className="p-4">{r.customer_name}</td>
                                        <td className="p-4">{new Date(r.order_date).toLocaleDateString('pt-BR')}</td>
                                        <td className="p-4 capitalize">{getPaymentMethodName(r.payment_method, r.payment_details)}</td>
                                        <td className="p-4">{new Date(r.created_at).toLocaleString('pt-BR')}</td>
                                        <td className="p-4 font-bold">R$ {Number(r.amount).toFixed(2)}</td>
                                        <td className="p-4 text-gray-600 break-words">{r.reason}</td>
                                        <td className="p-4">{r.requester_name}</td>
                                        <td className="p-4">{getStatusChip(r.status)}</td>
                                        <td className="p-4">
                                            {r.status === 'pending_approval' && (
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleApprove(r)} className="p-2 text-green-600 hover:bg-green-100 rounded-full" title="Aprovar"><CheckIcon className="h-5 w-5"/></button>
                                                    <button onClick={() => { setSelectedRefund(r); setIsDenyModalOpen(true); }} className="p-2 text-red-600 hover:bg-red-100 rounded-full" title="Negar"><XMarkIcon className="h-5 w-5"/></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                     {/* Mobile Card View */}
                     <div className="md:hidden space-y-4 p-4">
                        {filteredRefunds.map(r => (
                            <div key={r.id} className="bg-white border rounded-lg p-4 shadow-sm text-sm">
                                <div className="flex justify-between items-start mb-3 pb-3 border-b">
                                    <div>
                                        <p className="font-bold">Pedido #{r.order_id}</p>
                                        <p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString('pt-BR')}</p>
                                    </div>
                                    {getStatusChip(r.status)}
                                </div>
                                <div className="grid grid-cols-2 gap-y-2 gap-x-4 mb-3">
                                    <div><strong className="text-gray-500 block">Cliente</strong> {r.customer_name}</div>
                                    <div><strong className="text-gray-500 block">Valor</strong> <span className="font-bold">R$ {Number(r.amount).toFixed(2)}</span></div>
                                    <div><strong className="text-gray-500 block">Data Pedido</strong> {new Date(r.order_date).toLocaleDateString('pt-BR')}</div>
                                    <div><strong className="text-gray-500 block">Pagamento</strong> <span className="capitalize">{getPaymentMethodName(r.payment_method, r.payment_details)}</span></div>
                                    <div><strong className="text-gray-500 block">Solicitado por</strong> {r.requester_name}</div>
                                </div>
                                <div className="border-t pt-3">
                                    <strong className="text-gray-500 block mb-1">Motivo da Solicitação</strong>
                                    <p className="text-gray-700 break-words">{r.reason}</p>
                                </div>
                                {r.status === 'pending_approval' && (
                                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                                        <button onClick={() => { setSelectedRefund(r); setIsDenyModalOpen(true); }} className="px-3 py-1.5 bg-red-100 text-red-700 font-semibold rounded-md">Negar</button>
                                        <button onClick={() => handleApprove(r)} className="px-3 py-1.5 bg-green-100 text-green-700 font-semibold rounded-md">Aprovar</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [editFormData, setEditFormData] = useState({ status: '', tracking_code: '' });
    const notification = useNotification();

    const [currentPage, setCurrentPage] = useState(1);
    const [orderIdSearch, setOrderIdSearch] = useState('');
    const [newOrdersCount, setNewOrdersCount] = useState(0);
    const [showNewOrderNotification, setShowNewOrderNotification] = useState(true);
    const ordersPerPage = 10;

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        status: '',
        customerName: '',
        minPrice: '',
        maxPrice: '',
    });

    // --- Estados para o Modal de Reembolso ---
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [refundAmount, setRefundAmount] = useState(0);
    const [refundReason, setRefundReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Define os fluxos de status separados
    const shippingStatuses = [
        'Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Enviado', 'Saiu para Entrega', 'Entregue',
        'Pagamento Recusado', 'Cancelado', /* 'Reembolsado' removido */
    ];
    const pickupStatuses = [
        'Pendente', 'Pagamento Aprovado', 'Separando Pedido', 'Pronto para Retirada', 'Entregue',
        'Pagamento Recusado', 'Cancelado', /* 'Reembolsado' removido */
    ];

    const fetchOrders = useCallback(() => {
        apiService('/orders')
            .then(data => {
                const sortedData = data.sort((a,b) => new Date(b.date) - new Date(a.date));
                setOrders(sortedData);

                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const recentOrders = sortedData.filter(o => {
                    if (!o || !o.date) return false;
                    const orderDate = new Date(o.date);
                    return !isNaN(orderDate) && orderDate > twentyFourHoursAgo;
                });
                setNewOrdersCount(recentOrders.length);

            })
            .catch(err => console.error("Falha ao buscar pedidos:", err));
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);
    
    const handleOpenEditModal = async (order) => {
        try {
            const fullOrderDetails = await apiService(`/orders/${order.id}`);
            setEditingOrder(fullOrderDetails);
            setEditFormData({
                status: fullOrderDetails.status,
                tracking_code: fullOrderDetails.tracking_code || ''
            });
            setIsEditModalOpen(true);
        } catch (error) {
            notification.show("Erro ao buscar detalhes do pedido.", 'error');
            console.error(error);
        }
    };

    const handleOpenRefundModal = () => {
        if (!editingOrder) return;
        setRefundAmount(editingOrder.total);
        setRefundReason('');
        setIsEditModalOpen(false); // Fecha o modal de detalhes
        setIsRefundModalOpen(true); // Abre o modal de reembolso
    };

    const handleRequestRefund = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            if (parseFloat(refundAmount) > parseFloat(editingOrder.total)) {
                throw new Error("O valor do reembolso não pode ser maior que o total do pedido.");
            }
            const result = await apiService('/refunds', 'POST', {
                order_id: editingOrder.id,
                amount: refundAmount,
                reason: refundReason,
            });
            notification.show(result.message);
            setIsRefundModalOpen(false);
            fetchOrders();
        } catch (error) {
            notification.show(`Erro ao solicitar reembolso: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEditFormChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveOrder = async (e) => {
        e.preventDefault();
        if (!editingOrder) return;
        try {
            await apiService(`/orders/${editingOrder.id}`, 'PUT', editFormData);
            fetchOrders();
            setIsEditModalOpen(false);
            setEditingOrder(null);
            notification.show('Pedido atualizado com sucesso!');
        } catch(error) {
            notification.show(`Erro ao atualizar pedido: ${error.message}`, 'error');
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const applyFilters = useCallback(() => {
        let tempOrders = [...orders];

        if (orderIdSearch) {
            tempOrders = tempOrders.filter(o => String(o.id).includes(orderIdSearch));
        }
        
        if (filters.startDate) {
            tempOrders = tempOrders.filter(o => new Date(o.date) >= new Date(filters.startDate));
        }
        if (filters.endDate) {
            const endOfDay = new Date(filters.endDate);
            endOfDay.setHours(23, 59, 59, 999);
            tempOrders = tempOrders.filter(o => new Date(o.date) <= endOfDay);
        }
        if (filters.status) {
            tempOrders = tempOrders.filter(o => o.status === filters.status);
        }
        if (filters.customerName) {
            tempOrders = tempOrders.filter(o => o.user_name.toLowerCase().includes(filters.customerName.toLowerCase()));
        }
        if (filters.minPrice) {
            tempOrders = tempOrders.filter(o => parseFloat(o.total) >= parseFloat(filters.minPrice));
        }
        if (filters.maxPrice) {
            tempOrders = tempOrders.filter(o => parseFloat(o.total) <= parseFloat(filters.maxPrice));
        }
        
        setFilteredOrders(tempOrders);
        setCurrentPage(1);
    }, [orders, filters, orderIdSearch]);
    
    useEffect(() => {
        applyFilters();
    }, [filters, orderIdSearch, orders, applyFilters]);

    const clearFilters = () => {
        setFilters({ startDate: '', endDate: '', status: '', customerName: '', minPrice: '', maxPrice: '' });
        setOrderIdSearch('');
        setCurrentPage(1);
    }

    const getStatusChipClass = (status) => {
        const lowerStatus = status ? status.toLowerCase() : '';
        if (lowerStatus.includes('entregue')) return 'bg-green-100 text-green-800';
        if (lowerStatus.includes('cancelado') || lowerStatus.includes('recusado') || lowerStatus.includes('reembolsado')) return 'bg-red-100 text-red-800';
        if (lowerStatus.includes('pendente')) return 'bg-yellow-100 text-yellow-800';
        return 'bg-blue-100 text-blue-800';
    };
    
    const indexOfLastOrder = currentPage * ordersPerPage;
    const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
    const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

    return (
        <div>
            <AnimatePresence>
                {isRefundModalOpen && editingOrder && (
                    <Modal isOpen={true} onClose={() => setIsRefundModalOpen(false)} title={`Solicitar Reembolso para Pedido #${editingOrder.id}`}>
                        <form onSubmit={handleRequestRefund} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Valor a Reembolsar</label>
                                <input type="number" step="0.01" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} max={editingOrder.total} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                                <p className="text-xs text-gray-500 mt-1">Valor total do pedido: R$ {Number(editingOrder.total).toFixed(2)}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Motivo do Reembolso</label>
                                <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} required rows="4" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setIsRefundModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
                                <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-amber-600 text-white rounded-md flex items-center gap-2 disabled:bg-amber-300">
                                    {isProcessing && <SpinnerIcon className="h-5 w-5" />}
                                    Enviar Solicitação
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {editingOrder && (() => {
                    const baseStatuses = editingOrder.shipping_method === 'Retirar na loja' 
                        ? pickupStatuses 
                        : shippingStatuses;
                    
                    const availableStatuses = baseStatuses.filter(s => s !== 'Reembolsado');

                    if (!availableStatuses.includes(editingOrder.status)) {
                        availableStatuses.push(editingOrder.status);
                    }

                    const canRequestRefund = editingOrder.payment_status === 'approved' && !editingOrder.refund_id && editingOrder.status !== 'Cancelado' && editingOrder.status !== 'Reembolsado';

                    return (
                        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Detalhes do Pedido #${editingOrder.id}`}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm items-start">
                                    <div>
                                        <h4 className="font-bold text-gray-700 mb-1">Cliente</h4>
                                        <p>{editingOrder.user_name}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-700 mb-1">Pagamento</h4>
                                        {(() => {
                                            if (!editingOrder.payment_details) {
                                                return <p className="capitalize">{editingOrder.payment_method || 'N/A'}</p>;
                                            }
                                            try {
                                                const details = JSON.parse(editingOrder.payment_details);
                                                if (details.method === 'credit_card') {
                                                    return (
                                                        <div className="text-sm">
                                                            <p className="font-semibold text-gray-800">Cartão de Crédito</p>
                                                            <p className="text-gray-600">Bandeira: <span className="uppercase">{details.card_brand}</span></p>
                                                            <p className="text-gray-600">Final: •••• {details.card_last_four}</p>
                                                            <p className="text-gray-600">Parcelas: {details.installments}x</p>
                                                        </div>
                                                    );
                                                }
                                                if (details.method === 'pix') {
                                                    return <p className="font-semibold text-gray-800">Pix</p>;
                                                }
                                                if (details.method === 'boleto') {
                                                    return <p className="font-semibold text-gray-800">Boleto</p>;
                                                }
                                            } catch (e) {
                                                return <p className="capitalize">{editingOrder.payment_method || 'N/A'}</p>;
                                            }
                                            return <p className="capitalize">{editingOrder.payment_method || 'N/A'}</p>;
                                        })()}
                                    </div>
                                </div>
                                {editingOrder.shipping_method === 'Retirar na loja' ? (
                                    <div>
                                        <h4 className="font-bold text-gray-700 mb-1">Detalhes da Retirada</h4>
                                        <div className="text-sm bg-blue-50 p-3 rounded-md border border-blue-200">
                                            <p className="font-semibold text-blue-800 flex items-center gap-2"><BoxIcon className="h-5 w-5"/> Este pedido será retirado na loja.</p>
                                            {(() => {
                                                try {
                                                    const details = JSON.parse(editingOrder.pickup_details);
                                                    return (
                                                        <div className="mt-2 pt-2 border-t">
                                                            <p><strong>Nome:</strong> {details.personName}</p>
                                                            <p><strong>CPF:</strong> {maskCPF(details.personCpf)}</p>
                                                        </div>
                                                    )
                                                } catch { return <p className="text-red-600 mt-2">Erro: Detalhes de retirada mal formatados.</p> }
                                            })()}
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <h4 className="font-bold text-gray-700 mb-1">Endereço de Entrega</h4>
                                        <div className="text-sm bg-gray-100 p-3 rounded-md">
                                            {editingOrder.shipping_address ? (() => {
                                                try {
                                                    const addr = JSON.parse(editingOrder.shipping_address);
                                                    return (
                                                        <div className="space-y-1">
                                                            <p><span className="font-semibold text-gray-500">Rua:</span> {addr.logradouro}</p>
                                                            <p><span className="font-semibold text-gray-500">Nº:</span> {addr.numero} {addr.complemento && `- ${addr.complemento}`}</p>
                                                            <p><span className="font-semibold text-gray-500">Bairro:</span> {addr.bairro}</p>
                                                            <p><span className="font-semibold text-gray-500">Cidade:</span> {addr.localidade} - {addr.uf}</p>
                                                            <p><span className="font-semibold text-gray-500">CEP:</span> {addr.cep}</p>
                                                        </div>
                                                    )
                                                } catch { return <p>Endereço mal formatado.</p> }
                                            })() : <p>Nenhum endereço de entrega.</p>}
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-bold text-gray-700 mb-2">Itens do Pedido</h4>
                                    <div className="space-y-2 border-t pt-2 max-h-48 overflow-y-auto">
                                        {editingOrder.items?.map(item => (
                                            <div key={item.id} className="flex items-center text-sm">
                                                <img src={getFirstImage(item.images)} alt={item.name} className="h-12 w-12 object-contain mr-3 bg-gray-100 rounded"/>
                                                <div>
                                                    <p className="font-semibold text-gray-800">{item.name}</p>
                                                    <p className="text-gray-600">{item.quantity} x R$ {Number(item.price).toFixed(2)}</p>
                                                    {item.variation && typeof item.variation === 'object' && (
                                                        <p className="text-xs text-indigo-600 bg-indigo-100 font-medium rounded-full px-2 py-1 w-fit mt-1">Cor: {item.variation.color} / Tamanho: {item.variation.size}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-700 mb-2">Resumo Financeiro</h4>
                                    <div className="text-sm bg-gray-100 p-3 rounded-md space-y-1">
                                        <div className="flex justify-between"><span>Subtotal:</span> <span>R$ {(editingOrder.items?.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0) || 0).toFixed(2)}</span></div>
                                        <div className="flex justify-between"><span>Frete ({editingOrder.shipping_method || 'N/A'}):</span> <span>R$ {Number(editingOrder.shipping_cost || 0).toFixed(2)}</span></div>
                                        {Number(editingOrder.discount_amount) > 0 && (<div className="flex justify-between text-green-600"><span>Desconto ({editingOrder.coupon_code || ''}):</span><span>- R$ {Number(editingOrder.discount_amount).toFixed(2)}</span></div>)}
                                        <div className="flex justify-between font-bold text-base border-t mt-2 pt-2"><span>Total:</span> <span>R$ {Number(editingOrder.total).toFixed(2)}</span></div>
                                    </div>
                                </div>
                                <form onSubmit={handleSaveOrder} className="space-y-4 border-t pt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Status do Pedido</label>
                                        <select name="status" value={editFormData.status} onChange={handleEditFormChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500">
                                            {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    {editingOrder.shipping_method !== 'Retirar na loja' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Código de Rastreio</label>
                                            <input type="text" name="tracking_code" value={editFormData.tracking_code} onChange={handleEditFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500" />
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center space-x-3 pt-4">
                                        <div>
                                            {canRequestRefund ? (
                                                <button type="button" onClick={handleOpenRefundModal} className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 font-semibold">
                                                    Solicitar Reembolso
                                                </button>
                                            ) : (
                                                <p className="text-xs text-gray-500">
                                                    {editingOrder.refund_id ? "Reembolso já solicitado." : "Pedido não elegível para reembolso."}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-3">
                                            <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
                                            <button type="submit" className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900">Salvar Alterações</button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </Modal>
                    );
                })()}
            </AnimatePresence>
            
            <AnimatePresence>
                {newOrdersCount > 0 && showNewOrderNotification && (
                    <motion.div 
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="relative bg-blue-600 text-white p-4 rounded-lg shadow-lg mb-6 flex justify-between items-center"
                    >
                        <div className="flex items-center gap-3">
                            <CheckCircleIcon className="h-6 w-6"/>
                            <span className="font-semibold">
                                Você tem {newOrdersCount} novo(s) pedido(s) nas últimas 24 horas!
                            </span>
                        </div>
                        <button onClick={() => setShowNewOrderNotification(false)} className="p-1 rounded-full hover:bg-blue-500">
                            <XMarkIcon className="h-5 w-5"/>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <h1 className="text-3xl font-bold mb-6">Gerenciar Pedidos</h1>
            
            <div className="bg-white p-4 rounded-lg shadow-md mb-6 space-y-4">
                <h2 className="text-xl font-semibold">Pesquisa Avançada</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <input type="text" name="orderIdSearch" placeholder="Pesquisar por ID..." value={orderIdSearch} onChange={e => setOrderIdSearch(e.target.value)} className="p-2 border rounded-md col-span-1 md:col-span-2 lg:col-span-4"/>
                    <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="p-2 border rounded-md" title="Data de Início"/>
                    <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="p-2 border rounded-md" title="Data Final"/>
                    <input type="number" name="minPrice" placeholder="Preço Mín." value={filters.minPrice} onChange={handleFilterChange} className="p-2 border rounded-md"/>
                    <input type="number" name="maxPrice" placeholder="Preço Máx." value={filters.maxPrice} onChange={handleFilterChange} className="p-2 border rounded-md"/>
                    <input type="text" name="customerName" placeholder="Nome do Cliente" value={filters.customerName} onChange={handleFilterChange} className="p-2 border rounded-md md:col-span-2"/>
                    <select name="status" value={filters.status} onChange={handleFilterChange} className="p-2 border rounded-md bg-white">
                        <option value="">Todos os Status</option>
                        {[...new Set([...shippingStatuses, ...pickupStatuses])].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="mt-4 flex gap-2 flex-wrap">
                    <button onClick={applyFilters} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Aplicar Filtros</button>
                    <button onClick={clearFilters} className="bg-gray-400 text-white px-4 py-2 rounded-md hover:bg-gray-500">Limpar Filtros</button>
                </div>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="hidden lg:block overflow-x-auto">
                     <table className="w-full text-left">
                         <thead className="bg-gray-100">
                            <tr>
                                <th className="p-4 font-semibold">Pedido ID</th>
                                <th className="p-4 font-semibold">Cliente</th>
                                <th className="p-4 font-semibold">Data</th>
                                <th className="p-4 font-semibold">Total</th>
                                <th className="p-4 font-semibold">Entrega</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold">Ações</th>
                            </tr>
                         </thead>
                         <tbody>
                            {currentOrders.map(o => {
                                const orderDate = new Date(o.date);
                                const formattedDate = !isNaN(orderDate) ? orderDate.toLocaleString('pt-BR') : 'Data Inválida';
                                return (
                                    <tr key={o.id} className="border-b hover:bg-gray-50">
                                        <td className="p-4 font-mono">#{o.id}</td>
                                        <td className="p-4">{o.user_name}</td>
                                        <td className="p-4">{formattedDate}</td>
                                        <td className="p-4">R$ {Number(o.total).toFixed(2)}</td>
                                        <td className="p-4">
                                            {o.shipping_method === 'Retirar na loja' ? (
                                                <span className="flex items-center gap-2 text-sm text-blue-800"><BoxIcon className="h-5 w-5"/> Retirada</span>
                                            ) : (
                                                <span className="flex items-center gap-2 text-sm text-gray-700"><TruckIcon className="h-5 w-5"/> Envio</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col items-start gap-1">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusChipClass(o.status)}`}>{o.status}</span>
                                                {o.refund_status === 'pending_approval' && (
                                                    <span className="flex items-center gap-1 mt-1 px-2 py-0.5 text-xs font-bold rounded-full bg-orange-100 text-orange-800 animate-pulse">
                                                        <ArrowUturnLeftIcon className="h-3 w-3"/>
                                                        Reembolso Solicitado
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4"><button onClick={() => handleOpenEditModal(o)} className="text-blue-600 hover:text-blue-800"><EditIcon className="h-5 w-5"/></button></td>
                                    </tr>
                                );
                            })}
                         </tbody>
                     </table>
                </div>

                <div className="lg:hidden space-y-4 p-4">
                    {currentOrders.map(o => {
                        const orderDate = new Date(o.date);
                        const formattedDateOnly = !isNaN(orderDate) ? orderDate.toLocaleDateString('pt-BR') : 'Data Inválida';
                        return (
                            <div key={o.id} className="bg-white border rounded-lg p-4 shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold">Pedido #{o.id}</p>
                                        <p className="text-sm text-gray-600">{o.user_name}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusChipClass(o.status)}`}>{o.status}</span>
                                        {o.refund_status === 'pending_approval' && (
                                            <span className="flex items-center gap-1 mt-1 px-2 py-0.5 text-xs font-bold rounded-full bg-orange-100 text-orange-800 animate-pulse">
                                                <ArrowUturnLeftIcon className="h-3 w-3"/>
                                                Reembolso Solicitado
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-sm border-t pt-4">
                                     <div><strong className="text-gray-500 block">Data</strong> {formattedDateOnly}</div>
                                     <div><strong className="text-gray-500 block">Total</strong> R$ {Number(o.total).toFixed(2)}</div>
                                     <div className="col-span-2">
                                        <strong className="text-gray-500 block">Entrega</strong>
                                        {o.shipping_method === 'Retirar na loja' ? (
                                            <span className="flex items-center gap-2 text-sm text-blue-800"><BoxIcon className="h-5 w-5"/> Retirada na Loja</span>
                                        ) : (
                                            <span className="flex items-center gap-2 text-sm text-gray-700"><TruckIcon className="h-5 w-5"/> Envio Padrão</span>
                                        )}
                                    </div>
                                </div>
                                 <div className="flex justify-end mt-4 pt-2 border-t">
                                    <button onClick={() => handleOpenEditModal(o)} className="flex items-center space-x-2 text-sm text-blue-600 font-semibold"><EditIcon className="h-4 w-4"/> <span>Detalhes</span></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 font-semibold">Anterior</button>
                    <span className="text-sm font-semibold">Página {currentPage} de {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 font-semibold">Próxima</button>
                </div>
            )}
        </div>
    );
};
const AdminReports = () => {
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const notification = useNotification();
    
    // Define as datas padrão
    const getFirstDayOfMonth = () => {
        const date = new Date();
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        return date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    };
    const getToday = () => {
        return new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
    };

    const [startDate, setStartDate] = useState(getFirstDayOfMonth());
    const [endDate, setEndDate] = useState(getToday());

    // Função para buscar os dados da API
    const handleGenerateReport = useCallback(() => {
        setIsLoading(true);
        setReportData(null); // Limpa dados antigos
        
        // Destrói gráficos antigos para evitar sobreposição
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

    // Busca o relatório do mês atual ao carregar a página
    useEffect(() => {
        handleGenerateReport();
    }, [handleGenerateReport]); // Roda apenas uma vez na montagem

    // Efeito para RENDERIZAR os gráficos DEPOIS que os dados chegarem
    useEffect(() => {
        if (reportData && !isLoading) {
            const renderCharts = () => {
                if (window.Chart) {
                    // Gráfico de Vendas ao Longo do Tempo
                    const salesCtx = document.getElementById('salesOverTimeChart')?.getContext('2d');
                    if (salesCtx && reportData.salesOverTime) {
                        if (window.mySalesOverTimeChart) window.mySalesOverTimeChart.destroy();
                        
                        // --- CORREÇÃO DA DATA ---
                        const safeLabels = reportData.salesOverTime.map(d => {
                            if (!d.sale_date) return "Data Inválida";
                            // Passa a string ISO completa (ex: 2025-10-18T03:00:00.000Z)
                            const dateObj = new Date(d.sale_date); 
                            if (isNaN(dateObj.getTime())) {
                                return "Data Inválida";
                            }
                            // Formata a data na localidade BR, tratando como UTC para evitar problemas de fuso
                            return dateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                        });

                        window.mySalesOverTimeChart = new window.Chart(salesCtx, {
                            type: 'line',
                            data: {
                                labels: safeLabels, // <-- USA AS LABELS CORRIGIDAS
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
                    
                    // Gráfico de Produtos Mais Vendidos
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
                    console.warn("Chart.js não carregado, tentando renderizar gráficos novamente...");
                    setTimeout(renderCharts, 100);
                }
            };
            renderCharts();
        }
    }, [reportData, isLoading]); // Depende dos dados e do status de carregamento

    const StatCard = ({ title, value }) => (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <h4 className="text-sm font-semibold text-gray-500 uppercase">{title}</h4>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
    );

    // --- INÍCIO DAS FUNÇÕES DE EXPORTAÇÃO (Movidas para dentro do componente) ---
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

            // Tabela de Produtos Mais Vendidos
            doc.setFontSize(12);
            doc.text("Produtos Mais Vendidos (por Unidade)", 14, lastY);
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
            lastY = doc.lastAutoTable.finalY + 10;
            
            // Tabela de Clientes Mais Valiosos
            doc.setFontSize(12);
            doc.text("Clientes Mais Valiosos", 14, lastY);
            doc.autoTable({
                startY: lastY + 5,
                head: [['Cliente', 'E-mail', 'Total de Pedidos', 'Valor Gasto (R$)']],
                body: reportData.topCustomers.map(c => [
                    c.name,
                    c.email,
                    c.total_orders,
                    `R$ ${Number(c.total_spent).toFixed(2)}`
                ]),
                theme: 'striped'
            });

            doc.save(`relatorio_detalhado_${startDate}_a_${endDate}.pdf`);
        }, ['pdf']);
    };
    // --- FIM DAS FUNÇÕES DE EXPORTAÇÃO ---

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
                            className="mt-1 p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Data Final</label>
                        <input
                            type="date"
                            id="endDate"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="mt-1 p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <button
                        onClick={handleGenerateReport}
                        disabled={isLoading}
                        className="w-full md:w-auto bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-900 disabled:bg-gray-400 mt-3 md:mt-6"
                    >
                        {isLoading ? <SpinnerIcon /> : 'Gerar Relatório'}
                    </button>
                    {/* --- NOVO BOTÃO DE EXPORTAR PDF --- */}
                    <button
                        onClick={handleExportPDF}
                        disabled={isLoading || !reportData}
                        className="w-full md:w-auto bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400 mt-3 md:mt-6 flex items-center justify-center gap-2"
                    >
                        <DownloadIcon className="h-5 w-5"/>
                        Exportar PDF
                    </button>
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

                    {/* Tabela de Clientes */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="font-bold mb-4 text-lg">Clientes Mais Valiosos</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-3 font-semibold">Cliente</th>
                                        <th className="p-3 font-semibold">E-mail</th>
                                        <th className="p-3 font-semibold">Total de Pedidos</th>
                                        <th className="p-3 font-semibold">Valor Gasto (R$)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.topCustomers.map((customer, index) => (
                                        <tr key={index} className="border-b last:border-b-0 hover:bg-gray-50">
                                            <td className="p-3">{customer.name}</td>
                                            <td className="p-3">{customer.email}</td>
                                            <td className="p-3">{customer.total_orders}</td>
                                            <td className="p-3 font-medium">R$ {Number(customer.total_spent).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>
            )}

        </div>
    );
};

const AdminLogsPage = () => {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const notification = useNotification();

    useEffect(() => {
        apiService('/admin-logs')
            .then(data => {
                if(Array.isArray(data)) {
                    setLogs(data);
                } else {
                    setLogs([]);
                    notification.show('A resposta da API de logs é inválida.', 'error');
                }
            })
            .catch(err => notification.show(`Erro ao buscar logs: ${err.message}`, 'error'))
            .finally(() => setIsLoading(false));
    }, [notification]);

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Histórico de Ações</h1>
            {isLoading ? (
                <div className="flex justify-center items-center py-20"><SpinnerIcon className="h-8 w-8 text-amber-500"/></div>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-4 font-semibold">Data</th>
                                    <th className="p-4 font-semibold">Administrador</th>
                                    <th className="p-4 font-semibold">Ação</th>
                                    <th className="p-4 font-semibold">Detalhes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id} className="border-b hover:bg-gray-50">
                                        <td className="p-4 whitespace-nowrap text-gray-600">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                                        <td className="p-4 font-medium">{log.user_name}</td>
                                        <td className="p-4"><span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full capitalize">{log.action.replace(/_/g, ' ')}</span></td>
                                        <td className="p-4 text-gray-700 break-words">{log.details}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4 p-4">
                        {logs.map(log => (
                            <div key={log.id} className="bg-white border rounded-lg p-4 shadow-sm text-sm">
                                <div className="flex justify-between items-start mb-3 pb-3 border-b">
                                    <div>
                                        <p className="font-bold">{log.user_name}</p>
                                        <p className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString('pt-BR')}</p>
                                    </div>
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full capitalize">{log.action.replace(/_/g, ' ')}</span>
                                </div>
                                <div>
                                    <p className="text-gray-700 break-words">{log.details}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const MaintenancePage = () => {
    return (
        <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center p-4">
            <div className="text-center p-8 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 max-w-md w-full">
                <AdminIcon className="h-16 w-16 text-amber-400 mx-auto mb-6 animate-spin-slow" />
                <h1 className="text-3xl sm:text-4xl font-bold text-amber-400 mb-3">Site em Manutenção</h1>
                <p className="text-gray-300 text-lg">Estamos realizando melhorias para te atender melhor.</p>
                <p className="text-gray-400 mt-2">Voltamos em breve!</p>
            </div>
        </div>
    );
};

const MaintenanceModeToggle = () => {
    const [isOn, setIsOn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const notification = useNotification();

    const fetchStatus = useCallback(() => {
        apiService('/settings/maintenance')
            .then(data => setIsOn(data.status === 'on'))
            .catch(err => notification.show(`Erro ao buscar status: ${err.message}`, 'error'))
            .finally(() => setIsLoading(false));
    }, [notification]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const handleToggle = async () => {
        const newStatus = !isOn;
        setIsLoading(true);
        try {
            await apiService('/settings/maintenance', 'PUT', { status: newStatus ? 'on' : 'off' });
            setIsOn(newStatus);
            notification.show(`Modo de manutenção foi ${newStatus ? 'ATIVADO' : 'DESATIVADO'}.`);
        } catch (error) {
            notification.show(`Erro ao alterar status: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const spring = { type: "spring", stiffness: 700, damping: 30 };

    return (
        <div className={`bg-white p-6 rounded-lg shadow ${isOn ? 'border-l-4 border-red-500' : ''}`}>
            <h3 className="font-bold text-lg mb-3">Modo de Manutenção</h3>
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 max-w-xs">
                    {isOn 
                        ? "O site está em manutenção. Apenas administradores logados podem acessar." 
                        : "O site está online e acessível para todos os usuários."
                    }
                </p>
                {isLoading ? (
                    <SpinnerIcon className="h-6 w-6 text-gray-400"/>
                ) : (
                    <div 
                        className={`flex items-center w-14 h-8 rounded-full p-1 cursor-pointer transition-colors ${isOn ? 'bg-red-500 justify-end' : 'bg-gray-300 justify-start'}`}
                        onClick={handleToggle}
                    >
                        <motion.div 
                            className="w-6 h-6 bg-white rounded-full shadow-md" 
                            layout 
                            transition={spring} 
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

const BannerForm = ({ item, onSave, onCancel }) => {
    const [formData, setFormData] = useState(item);
    const [uploading, setUploading] = useState({ desktop: false, mobile: false });
    const desktopInputRef = useRef(null);
    const mobileInputRef = useRef(null);
    const notification = useNotification();

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
        }));
    };

    const handleFileChange = async (event, type) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploading(prev => ({ ...prev, [type]: true }));
        try {
            const uploadResult = await apiImageUploadService('/upload/image', file);
            const fieldName = type === 'desktop' ? 'image_url' : 'image_url_mobile';
            setFormData(prev => ({ ...prev, [fieldName]: uploadResult.imageUrl }));
            notification.show(`Upload da imagem de ${type} concluído!`);
        } catch (error) {
            notification.show(`Erro no upload: ${error.message}`, 'error');
        } finally {
            setUploading(prev => ({ ...prev, [type]: false }));
            event.target.value = '';
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Imagem do Banner (Desktop)</label>
                    <p className="text-xs text-gray-500 mt-1">Tamanho recomendado: **1920 x 720 pixels** (proporção 8:3).</p>
                    <div className="flex flex-col gap-2 mt-2">
                        <img src={formData.image_url || 'https://placehold.co/200x100/eee/ccc?text=Desktop'} alt="Preview Desktop" className="w-full h-24 object-cover rounded-md border bg-gray-100"/>
                        <input type="text" name="image_url" value={formData.image_url} onChange={handleChange} required placeholder="https://..." className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"/>
                        <input type="file" ref={desktopInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'desktop')} />
                        <button type="button" onClick={() => desktopInputRef.current.click()} disabled={uploading.desktop} className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-3 rounded-md flex items-center justify-center gap-2 disabled:opacity-50">
                            {uploading.desktop ? <><SpinnerIcon className="h-4 w-4"/> Enviando...</> : <><UploadIcon className="h-4 w-4"/> Upload Desktop</>}
                        </button>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Imagem do Banner (Mobile)</label>
                    <p className="text-xs text-gray-500 mt-1">Tamanho recomendado: **800 x 1200 pixels** (proporção 2:3, vertical).</p>
                    <div className="flex flex-col gap-2 mt-2">
                        <img src={formData.image_url_mobile || 'https://placehold.co/100x100/eee/ccc?text=Mobile'} alt="Preview Mobile" className="w-full h-24 object-cover rounded-md border bg-gray-100"/>
                        <input type="text" name="image_url_mobile" value={formData.image_url_mobile || ''} onChange={handleChange} placeholder="Opcional: https://..." className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"/>
                        <input type="file" ref={mobileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'mobile')} />
                        <button type="button" onClick={() => mobileInputRef.current.click()} disabled={uploading.mobile} className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-3 rounded-md flex items-center justify-center gap-2 disabled:opacity-50">
                            {uploading.mobile ? <><SpinnerIcon className="h-4 w-4"/> Enviando...</> : <><UploadIcon className="h-4 w-4"/> Upload Mobile</>}
                        </button>
                    </div>
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">Link de Destino</label>
                <input type="text" name="link_url" value={formData.link_url} onChange={handleChange} required placeholder="Ex: #products?category=Blusas" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Título (Opcional)</label>
                    <input type="text" name="title" value={formData.title || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Subtítulo (Opcional)</label>
                    <input type="text" name="subtitle" value={formData.subtitle || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div className="flex items-center pt-2">
                    <input type="checkbox" name="cta_enabled" id="cta_enabled_form" checked={!!formData.cta_enabled} onChange={handleChange} className="h-4 w-4 text-amber-600 border-gray-300 rounded"/>
                    <label htmlFor="cta_enabled_form" className="ml-2 block text-sm font-medium text-gray-700">Ativar Botão de Ação?</label>
                </div>
                {!!formData.cta_enabled && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Texto do Botão</label>
                        <input type="text" name="cta_text" value={formData.cta_text || ''} onChange={handleChange} placeholder="Ex: Ver Oferta" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                    </div>
                )}
            </div>
             <div className="flex items-center">
                <input type="checkbox" name="is_active" id="is_active_form" checked={!!formData.is_active} onChange={handleChange} className="h-4 w-4 text-amber-600 border-gray-300 rounded"/>
                <label htmlFor="is_active_form" className="ml-2 block text-sm text-gray-700">Ativo (visível no carrossel)</label>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-200 rounded-md hover:bg-gray-300 font-semibold">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 font-semibold">Salvar</button>
            </div>
        </form>
    );
};

const SortableBannerCard = ({ banner, onEdit, onDelete }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: banner.id });
    const style = { transform: CSS.Transform.toString(transform), transition, touchAction: 'none' };

    return (
        <div ref={setNodeRef} style={style} className={`bg-white border rounded-lg shadow-sm overflow-hidden group relative ${!banner.is_active ? 'opacity-50' : ''}`}>
             <div {...attributes} {...listeners} className="absolute top-2 right-2 p-2 bg-black/40 rounded-full cursor-grab active:cursor-grabbing text-white opacity-0 group-hover:opacity-100 transition-opacity z-10" title="Arraste para reordenar">
                <BarsGripIcon className="h-5 w-5" />
            </div>
            <img src={banner.image_url} alt={banner.title || 'Banner'} className="w-full h-32 object-cover"/>
            <div className="p-3">
                <p className="font-bold text-sm truncate">{banner.title || "Banner sem título"}</p>
                <p className="text-xs text-gray-500 truncate">Link: {banner.link_url}</p>
                <div className="flex justify-between items-center mt-3 pt-3 border-t">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${banner.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                        {banner.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => onEdit(banner)} className="p-1 text-gray-400 hover:text-amber-600"><EditIcon className="h-5 w-5"/></button>
                        <button onClick={() => onDelete(banner.id)} className="p-1 text-gray-400 hover:text-red-600"><TrashIcon className="h-5 w-5"/></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AdminBanners = () => {
    const [banners, setBanners] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [editingBanner, setEditingBanner] = useState(null);
    const notification = useNotification();
    const confirmation = useConfirmation();
    const sensors = useSensors(useSensor(PointerSensor));

    const fetchBanners = useCallback(() => {
        setIsLoading(true);
        apiService('/banners/admin')
            .then(data => {
                if (Array.isArray(data)) {
                    setBanners(data);
                } else {
                    setBanners([]);
                    notification.show("Erro: A resposta da API para buscar banners é inválida.", 'error');
                }
            })
            .catch(err => notification.show(`Erro ao buscar banners: ${err.message}`, 'error'))
            .finally(() => setIsLoading(false));
    }, [notification]);

    useEffect(() => { fetchBanners() }, [fetchBanners]);

    const handleOpenModal = (banner = null) => {
        const initialData = banner ? {...banner} : { name: '', link_url: '', image_url: '', is_active: 1, cta_enabled: 0, cta_text: 'Explorar Coleção' };
        setEditingBanner(initialData);
        setIsModalOpen(true);
    };

    const handleSave = async (formData) => {
        try {
            if (editingBanner && editingBanner.id) {
                await apiService(`/banners/${editingBanner.id}`, 'PUT', formData);
                notification.show('Banner atualizado com sucesso!');
            } else {
                await apiService('/banners/admin', 'POST', formData);
                notification.show('Banner criado com sucesso!');
            }
            fetchBanners();
            setIsModalOpen(false);
        } catch (error) {
            notification.show(`Erro ao salvar: ${error.message}`, 'error');
        }
    };

    const handleDelete = (id) => {
        confirmation.show("Tem certeza que deseja excluir este banner?", async () => {
            try {
                await apiService(`/banners/${id}`, 'DELETE');
                notification.show('Banner deletado com sucesso.');
                fetchBanners();
            } catch (error) {
                notification.show(`Erro ao deletar: ${error.message}`, 'error');
            }
        });
    };
    
    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = banners.findIndex((b) => b.id === active.id);
            const newIndex = banners.findIndex((b) => b.id === over.id);
            const newOrder = arrayMove(banners, oldIndex, newIndex);
            
            setBanners(newOrder); // UI Otimista

            setIsSavingOrder(true);
            const orderedIds = newOrder.map(b => b.id);
            try {
                await apiService('/banners/order', 'PUT', { orderedIds });
                notification.show('Ordem dos banners salva com sucesso!');
            } catch (error) {
                notification.show(`Erro ao salvar a ordem: ${error.message}`, 'error');
                fetchBanners(); // Reverte em caso de erro
            } finally {
                setIsSavingOrder(false);
            }
        }
    };

    return (
        <div>
            <AnimatePresence>
                {isModalOpen && (
                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingBanner && editingBanner.id ? 'Editar Banner' : 'Adicionar Novo Banner'}>
                        <BannerForm item={editingBanner} onSave={handleSave} onCancel={() => setIsModalOpen(false)} />
                    </Modal>
                )}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold">Gerenciar Banners</h1>
                <div className="flex items-center gap-4">
                    {isSavingOrder && <div className="flex items-center gap-2 text-sm text-gray-500"><SpinnerIcon/> Salvando ordem...</div>}
                    <button onClick={() => handleOpenModal()} className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900 flex items-center space-x-2 flex-shrink-0">
                        <PlusIcon className="h-5 w-5"/> <span>Novo Banner</span>
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20"><SpinnerIcon className="h-8 w-8 text-amber-500"/></div>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={banners} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {banners.map(banner => (
                                <SortableBannerCard key={banner.id} banner={banner} onEdit={handleOpenModal} onDelete={handleDelete} />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
};

const UserEditForm = ({ user, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'user',
        password: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Função</label>
                <select name="role" value={formData.role} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md">
                    <option value="user">Usuário</option>
                    <option value="admin">Administrador</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Nova Senha</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Deixe em branco para não alterar" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-200 rounded-md hover:bg-gray-300 font-semibold">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 font-semibold">Salvar Alterações</button>
            </div>
        </form>
    );
};

const UserDetailsModal = ({ user, onClose, onUserUpdate }) => {
    const [details, setDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailSubject, setEmailSubject] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const notification = useNotification();
    const confirmation = useConfirmation();

    const fetchDetails = useCallback(() => {
        if (user) {
            setIsLoading(true);
            apiService(`/users/${user.id}/details`)
                .then(setDetails)
                .catch(err => notification.show(`Erro ao buscar detalhes: ${err.message}`, 'error'))
                .finally(() => setIsLoading(false));
        }
    }, [user, notification]);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    const handleStatusChange = () => {
        if (!details) return;
        const newStatus = details.status === 'active' ? 'blocked' : 'active';
        const actionText = newStatus === 'blocked' ? 'bloquear' : 'desbloquear';

        confirmation.show(
            `Tem certeza que deseja ${actionText} este usuário? Esta ação requer confirmação.`, 
            async () => {
                try {
                    await apiService(`/users/${details.id}/status`, 'PUT', { status: newStatus });
                    notification.show(`Usuário ${actionText} com sucesso.`);
                    onUserUpdate();
                    fetchDetails();
                } catch (error) {
                    notification.show(`Erro ao ${actionText} usuário: ${error.message}`, 'error');
                }
            },
            { requiresAuth: true }
        );
    };

    const handleSaveUser = async (formData) => {
        try {
            await apiService(`/users/${details.id}`, 'PUT', formData);
            notification.show('Usuário atualizado com sucesso!');
            setIsEditModalOpen(false);
            onUserUpdate();
            fetchDetails();
        } catch (error) {
            notification.show(`Erro ao atualizar usuário: ${error.message}`, 'error');
        }
    };
    
    const handleSendEmail = (e) => {
        e.preventDefault();
        
        confirmation.show(
            `Você está prestes a enviar um e-mail para ${details.name}. Por favor, confirme sua identidade para continuar.`,
            async () => {
                setIsSendingEmail(true);
                try {
                    const result = await apiService(`/users/${details.id}/send-email`, 'POST', {
                        subject: emailSubject,
                        message: emailMessage
                    });
                    notification.show(result.message);
                    setIsEmailModalOpen(false);
                    setEmailSubject('');
                    setEmailMessage('');
                } catch (error) {
                    notification.show(`Erro ao enviar e-mail: ${error.message}`, 'error');
                } finally {
                    setIsSendingEmail(false);
                }
            },
            { requiresAuth: true, confirmText: 'Confirmar e Enviar' }
        );
    };
    
    const handleDelete = () => {
        confirmation.show(
            "Tem certeza que deseja EXCLUIR este usuário? Esta ação não pode ser desfeita.", 
            async () => {
                try {
                    await apiService(`/users/${details.id}`, 'DELETE');
                    notification.show('Usuário excluído com sucesso.');
                    onUserUpdate();
                    onClose();
                } catch (error) {
                    notification.show(`Erro ao excluir usuário: ${error.message}`, 'error');
                }
            },
            { requiresAuth: true, confirmText: 'Excluir Usuário', confirmColor: 'bg-red-600 hover:bg-red-700' }
        );
    };

    const openEditModalWithConfirmation = () => {
        confirmation.show(
            "Você está prestes a editar os dados de um usuário, incluindo permissões de acesso. Por favor, confirme sua identidade para continuar.",
            () => {
                setIsEditModalOpen(true);
            },
            { requiresAuth: true, confirmText: 'Continuar para Edição' }
        );
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Detalhes de ${user.name}`} size="3xl">
            <AnimatePresence>
                {isEditModalOpen && (
                    <Modal isOpen={true} onClose={() => setIsEditModalOpen(false)} title={`Editar Usuário: ${details.name}`}>
                        <UserEditForm user={details} onSave={handleSaveUser} onCancel={() => setIsEditModalOpen(false)} />
                    </Modal>
                )}
            </AnimatePresence>
            
            <AnimatePresence>
                {isEmailModalOpen && (
                    <Modal isOpen={true} onClose={() => setIsEmailModalOpen(false)} title={`Enviar E-mail para ${details.name}`}>
                        <form onSubmit={handleSendEmail} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Assunto</label>
                                <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Mensagem</label>
                                <textarea value={emailMessage} onChange={e => setEmailMessage(e.target.value)} required rows="6" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
                            </div>
                            <div className="flex justify-end pt-2">
                                <button type="submit" disabled={isSendingEmail} className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 font-semibold flex items-center gap-2 disabled:bg-gray-400">
                                    {isSendingEmail ? <SpinnerIcon className="h-5 w-5"/> : <PaperAirplaneIcon className="h-5 w-5"/>}
                                    {isSendingEmail ? 'Enviando...' : 'Enviar E-mail'}
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>

            {isLoading || !details ? (
                <div className="flex justify-center items-center h-64"><SpinnerIcon className="h-8 w-8 text-amber-500" /></div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg border grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <h4 className="text-sm font-bold text-gray-500">Nome</h4>
                            <p className="truncate">{details.name}</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-500">Email</h4>
                            <p className="truncate">{details.email}</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-500">CPF</h4>
                            <p>{details.cpf}</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-500">Status</h4>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${details.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {details.status === 'active' ? 'Ativo' : 'Bloqueado'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Últimos Pedidos (5)</h3>
                            <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                                {details.orders.length > 0 ? (
                                    <table className="w-full text-sm text-left"><tbody>
                                        {details.orders.map(order => (
                                            <tr key={order.id} className="border-b last:border-b-0"><td className="p-2 font-mono">#{order.id}</td><td className="p-2">{new Date(order.date).toLocaleDateString()}</td><td className="p-2">R$ {Number(order.total).toFixed(2)}</td><td className="p-2">{order.status}</td></tr>
                                        ))}
                                    </tbody></table>
                                ) : (<p className="text-center text-gray-500 p-4">Nenhum pedido encontrado.</p>)}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Últimos Logins (10)</h3>
                            <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                               {details.loginHistory.length > 0 ? (
                                    <table className="w-full text-sm text-left"><tbody>
                                        {details.loginHistory.map((login, index) => (
                                            <tr key={index} className="border-b last:border-b-0"><td className="p-2">{new Date(login.created_at).toLocaleString('pt-BR')}</td><td className="p-2">{login.ip_address}</td><td className={`p-2 font-semibold ${login.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>{login.status === 'success' ? 'Sucesso' : 'Falha'}</td></tr>
                                        ))}
                                    </tbody></table>
                               ) : (<p className="text-center text-gray-500 p-4">Nenhum histórico de login.</p>)}
                           </div>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
                        <button onClick={handleDelete} className="px-4 py-2 rounded-md font-semibold text-red-600 bg-red-100 hover:bg-red-200 flex items-center gap-2"><TrashIcon className="h-4 w-4"/> Excluir</button>
                        <button onClick={openEditModalWithConfirmation} className="px-4 py-2 rounded-md font-semibold text-blue-600 bg-blue-100 hover:bg-blue-200 flex items-center gap-2"><EditIcon className="h-4 w-4"/> Editar</button>
                        <button onClick={() => setIsEmailModalOpen(true)} className="px-4 py-2 rounded-md font-semibold text-purple-600 bg-purple-100 hover:bg-purple-200 flex items-center gap-2"><PaperAirplaneIcon className="h-4 w-4"/> Enviar E-mail</button>
                        <button onClick={handleStatusChange} className={`px-6 py-2 rounded-md font-semibold text-white ${details.status === 'active' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                            {details.status === 'active' ? 'Bloquear' : 'Desbloquear'}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

const CollectionCategoryForm = ({ item, onSave, onCancel }) => {
    const [formData, setFormData] = useState(item);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    const notification = useNotification();

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
        }));
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const uploadResult = await apiImageUploadService('/upload/image', file);
            setFormData(prev => ({ ...prev, image: uploadResult.imageUrl }));
            notification.show('Upload da imagem concluído!');
        } catch (error) {
            notification.show(`Erro no upload: ${error.message}`, 'error');
        } finally {
            setIsUploading(false);
            event.target.value = '';
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const menuSections = ['Perfumaria', 'Roupas', 'Conjuntos', 'Moda Íntima', 'Calçados', 'Acessórios'];
    const productTypeAssociations = [{value: 'none', label: 'Nenhuma'}, {value: 'perfume', label: 'Perfume'}, {value: 'clothing', label: 'Roupa'}];

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Nome da Categoria</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Valor do Filtro</label>
                <input type="text" name="filter" value={formData.filter} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Imagem</label>
                <div className="flex items-center gap-2 mt-1">
                    <img src={formData.image || 'https://placehold.co/100x100/eee/ccc?text=?'} alt="Preview" className="w-20 h-20 object-cover rounded-md border bg-gray-100"/>
                    <div className="flex-grow">
                        <input type="text" name="image" value={formData.image} onChange={handleChange} required placeholder="https://..." className="block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                        <button type="button" onClick={() => fileInputRef.current.click()} disabled={isUploading} className="mt-2 w-full text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-3 rounded-md flex items-center justify-center gap-2 disabled:opacity-50">
                            {isUploading ? <><SpinnerIcon className="h-4 w-4"/> Enviando...</> : <><UploadIcon className="h-4 w-4"/> Fazer Upload</>}
                        </button>
                    </div>
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">Seção Principal do Menu</label>
                <select name="menu_section" value={formData.menu_section} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md">
                    {menuSections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Associar à Categoria de Produto (no form de produto)</label>
                <select name="product_type_association" value={formData.product_type_association} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md">
                     {productTypeAssociations.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>
             <div className="flex items-center">
                <input type="checkbox" name="is_active" id="is_active_form" checked={!!formData.is_active} onChange={handleChange} className="h-4 w-4 text-amber-600 border-gray-300 rounded"/>
                <label htmlFor="is_active_form" className="ml-2 block text-sm text-gray-700">Ativa (visível na loja)</label>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-200 rounded-md hover:bg-gray-300 font-semibold">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 font-semibold">Salvar</button>
            </div>
        </form>
    );
};

const SortableCategoryCard = ({ cat, onEdit, onDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: cat.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className={`bg-white border rounded-lg shadow-sm overflow-hidden group flex flex-col relative ${!cat.is_active ? 'opacity-60' : ''}`}>
            <div 
                {...attributes} 
                {...listeners} 
                style={{ touchAction: 'none' }} // Aplica a regra de toque apenas no ícone
                className="absolute top-2 right-2 p-1.5 bg-black/30 rounded-full cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10"
                title="Arraste para reordenar"
            >
                <BarsGripIcon className="h-5 w-5 text-white" />
            </div>

            <div className="relative aspect-[4/5]">
                <img src={cat.image || 'https://placehold.co/400x500/eee/ccc?text=Sem+Imagem'} alt={cat.name} className="w-full h-full object-cover"/>
                <div className={`absolute top-2 left-2 px-2 py-0.5 text-xs font-bold text-white rounded-full ${cat.is_active ? 'bg-green-500' : 'bg-gray-500'}`}>
                    {cat.is_active ? 'Ativa' : 'Inativa'}
                </div>
            </div>
            <div className="p-3 bg-gray-50 flex-grow flex flex-col">
                <h3 className="font-semibold text-gray-800 text-sm text-center truncate flex-grow" title={cat.name}>{cat.name}</h3>
                <div className="flex items-center justify-center space-x-4 mt-3 pt-3 border-t">
                    <button onClick={() => onEdit(cat)} className="p-2 text-gray-500 hover:text-amber-600" title="Editar"><EditIcon className="h-5 w-5"/></button>
                    <button onClick={() => onDelete(cat.id)} className="p-2 text-gray-500 hover:text-red-600" title="Excluir"><TrashIcon className="h-5 w-5"/></button>
                </div>
            </div>
        </div>
    );
};

const AdminCollections = () => {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const notification = useNotification();
    const confirmation = useConfirmation();
    const sensors = useSensors(useSensor(PointerSensor));

    const fetchCategories = useCallback(() => {
        setIsLoading(true);
        apiService('/collections/admin')
            .then(data => {
                if (!Array.isArray(data)) {
                    notification.show("Erro: A resposta da API é inválida.", 'error');
                    setCategories([]);
                } else {
                    setCategories(data);
                }
            })
            .catch(err => {
                notification.show(`Erro ao buscar categorias: ${err.message}`, 'error');
                setCategories([]);
            })
            .finally(() => setIsLoading(false));
    }, [notification]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleOpenModal = (category = null) => {
        const initialData = category ? 
            {...category} : 
            { name: '', filter: '', image: '', is_active: 1, product_type_association: 'none', menu_section: 'Roupas'};
        setEditingCategory(initialData);
        setIsModalOpen(true);
    };

    const handleSave = async (formData) => {
        try {
            if (editingCategory && editingCategory.id) {
                await apiService(`/collections/${editingCategory.id}`, 'PUT', formData);
                notification.show('Categoria atualizada com sucesso!');
            } else {
                await apiService('/collections/admin', 'POST', formData);
                notification.show('Categoria criada com sucesso!');
            }
            fetchCategories();
            setIsModalOpen(false);
        } catch (error) {
            notification.show(`Erro ao salvar: ${error.message}`, 'error');
        }
    };

    const handleDelete = (id) => {
        confirmation.show("Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.", async () => {
            try {
                await apiService(`/collections/${id}`, 'DELETE');
                notification.show('Categoria deletada com sucesso.');
                fetchCategories();
            } catch (error) {
                notification.show(`Erro ao deletar: ${error.message}`, 'error');
            }
        });
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = categories.findIndex((c) => c.id === active.id);
            const newIndex = categories.findIndex((c) => c.id === over.id);
            const newOrder = arrayMove(categories, oldIndex, newIndex);
            
            setCategories(newOrder); // Atualização otimista da UI

            setIsSavingOrder(true);
            const orderedIds = newOrder.map(c => c.id);
            try {
                await apiService('/collections/order', 'PUT', { orderedIds });
                notification.show('Ordem salva com sucesso!');
            } catch (error) {
                notification.show(`Erro ao salvar a ordem: ${error.message}`, 'error');
                fetchCategories(); // Reverte para a ordem do servidor em caso de erro
            } finally {
                setIsSavingOrder(false);
            }
        }
    };

    return (
        <div>
            <AnimatePresence>
                {isModalOpen && (
                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCategory && editingCategory.id ? 'Editar Categoria' : 'Adicionar Nova Categoria'}>
                        <CollectionCategoryForm item={editingCategory} onSave={handleSave} onCancel={() => setIsModalOpen(false)} />
                    </Modal>
                )}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold">Gerenciar Coleções</h1>
                <div className="flex items-center gap-4">
                    {isSavingOrder && <div className="flex items-center gap-2 text-sm text-gray-500"><SpinnerIcon/> Salvando ordem...</div>}
                    <button onClick={() => handleOpenModal()} className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900 flex items-center space-x-2 flex-shrink-0">
                        <PlusIcon className="h-5 w-5"/> <span>Nova Categoria</span>
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20"><SpinnerIcon className="h-8 w-8 text-amber-500"/></div>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={categories} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {categories.map(cat => (
                                <SortableCategoryCard key={cat.id} cat={cat} onEdit={handleOpenModal} onDelete={handleDelete} />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
};

// --- COMPONENTE DO BOTÃO DE INSTALAÇÃO PWA ---
const InstallPWAButton = ({ deferredPrompt }) => {
    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`PWA setup user choice: ${outcome}`);
        }
    };

    return (
        <button
            onClick={handleInstallClick}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-black px-6 py-3 rounded-full shadow-lg hover:bg-amber-400 font-bold flex items-center gap-2 transition-transform hover:scale-105" // <-- Classe 'bottom-6' alterada para 'bottom-20'
        >
            <DownloadIcon className="h-5 w-5" />
            <span>Instalar App</span>
        </button>
    );
};

const BannerCarousel = memo(({ onNavigate }) => {
    const [banners, setBanners] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const minSwipeDistance = 50;

    useEffect(() => {
        apiService('/banners')
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    setBanners(data);
                }
            })
            .catch(err => {
                console.error("Falha ao buscar banners:", err);
            })
            .finally(() => setIsLoading(false));
    }, []);

    const goNext = useCallback(() => {
        setCurrentIndex(prev => (prev === banners.length - 1 ? 0 : prev + 1));
    }, [banners.length]);

    const goPrev = useCallback(() => {
        setCurrentIndex(prev => (prev === 0 ? banners.length - 1 : prev - 1));
    }, [banners.length]);

    useEffect(() => {
        if (banners.length > 1) {
            const timer = setTimeout(goNext, 5000);
            return () => clearTimeout(timer);
        }
    }, [currentIndex, banners.length, goNext]);
    
    const handleTouchStart = (e) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
    const handleTouchMove = (e) => { setTouchEnd(e.targetTouches[0].clientX); };
    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd || banners.length <= 1) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;
        if (isLeftSwipe) goNext();
        else if (isRightSwipe) goPrev();
        setTouchStart(null);
        setTouchEnd(null);
    };

    const bannerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.2 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
    };

    if (isLoading) {
        return <div className="relative h-[90vh] sm:h-[70vh] bg-gray-900 flex items-center justify-center"><SpinnerIcon className="h-10 w-10 text-amber-400" /></div>;
    }
    
    if (banners.length === 0) return null;
    
    const isMobile = window.innerWidth < 640;
    const currentBanner = banners[currentIndex];
    const imageUrl = isMobile && currentBanner.image_url_mobile ? currentBanner.image_url_mobile : currentBanner.image_url;

    return (
        <section 
            className="relative h-[90vh] sm:h-[70vh] w-full overflow-hidden group bg-black"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <AnimatePresence>
                <motion.div
                    key={currentIndex}
                    className="absolute inset-0 cursor-pointer"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    onClick={() => onNavigate(currentBanner.link_url.replace(/^#/, ''))}
                >
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${imageUrl})` }} />
                    <div className="absolute inset-0 bg-black/40" />
                    
                    {(currentBanner.title || currentBanner.subtitle || currentBanner.cta_enabled) && (
                         <motion.div 
                            className="relative z-10 h-full flex flex-col items-center justify-center text-center text-white p-4"
                            variants={bannerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            key={`content-${currentIndex}`}
                         >
                            {currentBanner.title && (
                                <motion.h1 
                                    variants={itemVariants}
                                    className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-wider drop-shadow-lg"
                                >
                                    {currentBanner.title}
                                </motion.h1>
                            )}
                            {currentBanner.subtitle && (
                                <motion.p 
                                    variants={itemVariants}
                                    className="text-lg md:text-xl mt-4 max-w-2xl text-gray-200"
                                >
                                    {currentBanner.subtitle}
                                </motion.p>
                            )}
                             {currentBanner.cta_enabled === 1 && currentBanner.cta_text && (
                                <motion.div variants={itemVariants}>
                                    <button className="mt-8 bg-amber-400 text-black px-8 sm:px-10 py-3 rounded-md text-lg font-bold hover:bg-amber-300 transition-colors">
                                        {currentBanner.cta_text}
                                    </button>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </motion.div>
            </AnimatePresence>

            {banners.length > 1 && (
                <>
                    <button onClick={goPrev} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/30 rounded-full text-white md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={goNext} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/30 rounded-full text-white md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
                        {banners.map((_, index) => (
                            <button key={index} onClick={() => setCurrentIndex(index)} className={`w-3 h-3 rounded-full transition-colors ${currentIndex === index ? 'bg-amber-400' : 'bg-white/50'}`} />
                        ))}
                    </div>
                </>
            )}
        </section>
    );
});

// --- COMPONENTE PRINCIPAL DA APLICAÇÃO ---
function AppContent({ deferredPrompt }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.hash.slice(1) || 'home');
  const [isInMaintenance, setIsInMaintenance] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(true);

  // Efeito para buscar o status de manutenção (inicial e periodicamente)
  useEffect(() => {
    const checkStatus = () => {
        apiService('/settings/maintenance-status')
            .then(data => {
                const isNowInMaintenance = data.maintenanceMode === 'on';
                // Apenas atualiza o estado se o status mudou, para evitar re-renderizações desnecessárias
                setIsInMaintenance(prevStatus => {
                    if (prevStatus !== isNowInMaintenance) {
                        return isNowInMaintenance;
                    }
                    return prevStatus;
                });
            })
            .catch(err => {
                console.error("Falha ao verificar o modo de manutenção, o site continuará online por segurança.", err);
                setIsInMaintenance(false);
            })
            .finally(() => {
                // Garante que a tela de carregamento só desapareça na primeira vez
                if (isStatusLoading) {
                    setIsStatusLoading(false);
                }
            });
    };

    checkStatus(); // Verifica imediatamente quando o componente monta

    const intervalId = setInterval(checkStatus, 30000); // E repete a verificação a cada 30 segundos

    return () => clearInterval(intervalId); // Limpa o intervalo quando o componente é desmontado
  }, [isStatusLoading]); // Dependência para garantir que o `finally` funcione corretamente na primeira vez

  const navigate = useCallback((path) => {
    window.location.hash = path;
  }, []);
  
  useEffect(() => {
    const pendingOrderId = sessionStorage.getItem('pendingOrderId');
    
    if (pendingOrderId && !currentPath.startsWith('order-success')) {
      console.log(`Detected return from payment for order ${pendingOrderId}. Redirecting to success page.`);
      sessionStorage.removeItem('pendingOrderId'); 
      navigate(`order-success/${pendingOrderId}`);
    } else if (currentPath.startsWith('order-success')) {
        sessionStorage.removeItem('pendingOrderId');
    }
  }, [currentPath, navigate]); 
  
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash.slice(1) || 'home');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPath]);
  
  if (isLoading || isStatusLoading) {
      return (
        <div className="h-screen flex items-center justify-center bg-black">
            <SpinnerIcon className="h-8 w-8 text-amber-400"/>
        </div>
      );
  }

  const isAdminLoggedIn = isAuthenticated && user.role === 'admin';
  const isAdminDomain = window.location.hostname.includes('vercel.app');

  if (isInMaintenance && !isAdminLoggedIn && !isAdminDomain) {
      return <MaintenancePage />;
  }

  const renderPage = () => {
    const [path, queryString] = currentPath.split('?');
    const searchParams = new URLSearchParams(queryString);
    const initialSearch = searchParams.get('search') || '';
    const initialCategory = searchParams.get('category') || '';
    const initialBrand = searchParams.get('brand') || '';
    const initialIsPromo = searchParams.get('promo') === 'true';
    
    const pathParts = path.split('/');
    const mainPage = pathParts[0];
    const pageId = pathParts[1];

    if (mainPage === 'admin') {
        if (!isAuthenticated || user.role !== 'admin') {
             return <LoginPage onNavigate={navigate} />;
        }
        
        const adminSubPage = pageId || 'dashboard';
        const adminPages = {
            'dashboard': <AdminDashboard onNavigate={navigate} />, 
            'banners': <AdminBanners />,
            'products': <AdminProducts onNavigate={navigate} />,
            'orders': <AdminOrders />,
            'refunds': <AdminRefunds onNavigate={navigate} />,
            'collections': <AdminCollections />,
            'users': <AdminUsers />,
            'coupons': <AdminCoupons />,
            'reports': <AdminReports />,
            'logs': <AdminLogsPage />,
        };

        return (
            <AdminLayout activePage={adminSubPage} onNavigate={navigate}>
                {adminPages[adminSubPage] || <AdminDashboard onNavigate={navigate} />}
            </AdminLayout>
        );
    }

    if ((mainPage === 'account' || mainPage === 'wishlist' || mainPage === 'checkout') && !isAuthenticated) {
        return <LoginPage onNavigate={navigate} />;
    }
    
    if (mainPage === 'product' && pageId) {
        return <ProductDetailPage productId={parseInt(pageId)} onNavigate={navigate} />;
    }

    if (mainPage === 'order-success' && pageId) {
        return <OrderSuccessPage orderId={pageId} onNavigate={navigate} />;
    }
    
    if (mainPage === 'account') {
        return <MyAccountPage onNavigate={navigate} path={pathParts.slice(1).join('/')} />;
    }

   const pages = {
        'home': <HomePage onNavigate={navigate} />,
        'products': <ProductsPage onNavigate={navigate} initialSearch={initialSearch} initialCategory={initialCategory} initialBrand={initialBrand} initialIsPromo={initialIsPromo} />,
        'login': <LoginPage onNavigate={navigate} />,
        'register': <RegisterPage onNavigate={navigate} />,
        'cart': <CartPage onNavigate={navigate} />,
        'checkout': <CheckoutPage onNavigate={navigate} />,
        'wishlist': <WishlistPage onNavigate={navigate} />,
        'ajuda': <AjudaPage onNavigate={navigate} />,
        'about': <AboutPage />,
        'privacy': <PrivacyPolicyPage />,
        'terms': <TermsOfServicePage />,
        'forgot-password': <ForgotPasswordPage onNavigate={navigate} />,
    };
    return pages[mainPage] || <HomePage onNavigate={navigate} />;
  };

  const showHeaderFooter = !currentPath.startsWith('admin');
  
  return (
    <div className="bg-black min-h-screen flex flex-col">
      {showHeaderFooter && <Header onNavigate={navigate} />}
      <main className="flex-grow">{renderPage()}</main>
      {showHeaderFooter && !currentPath.startsWith('order-success') && (
        <footer className="bg-gray-900 text-gray-300 mt-auto border-t border-gray-800">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-left">
                    {/* Coluna 1: Sobre a Loja */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-amber-400">LovecestasePerfumes</h3>
                        <p className="text-sm text-gray-400">
                            Elegância que veste e perfuma. Descubra fragrâncias e peças que definem seu estilo e marcam momentos.
                        </p>
                    </div>

                    {/* Coluna 2: Institucional */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-white tracking-wider">Institucional</h3>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#about" onClick={(e) => { e.preventDefault(); navigate('about'); }} className="hover:text-amber-400 transition-colors">Sobre Nós</a></li>
                            <li><a href="#privacy" onClick={(e) => { e.preventDefault(); navigate('privacy'); }} className="hover:text-amber-400 transition-colors">Política de Privacidade</a></li>
                            <li><a href="#terms" onClick={(e) => { e.preventDefault(); navigate('terms'); }} className="hover:text-amber-400 transition-colors">Termos de Serviço</a></li>
                        </ul>
                    </div>

                    {/* Coluna 3: Atendimento */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-white tracking-wider">Atendimento</h3>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#ajuda" onClick={(e) => { e.preventDefault(); navigate('ajuda'); }} className="hover:text-amber-400 transition-colors">Central de Ajuda</a></li>
                            <li>
                                <div className="flex justify-center md:justify-start items-center gap-4 mt-2">
                                    <a href="https://wa.me/5583987379573" target="_blank" rel="noopener noreferrer" className="hover:text-green-500 transition-colors"><WhatsappIcon className="h-6 w-6"/></a>
                                    <a href="https://www.instagram.com/lovecestaseperfumesjp/" target="_blank" rel="noopener noreferrer" className="hover:text-pink-500 transition-colors"><InstagramIcon className="h-6 w-6"/></a>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Coluna 4: Formas de Pagamento */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-white tracking-wider">Formas de Pagamento</h3>
                        <div className="flex flex-wrap justify-center md:justify-start items-center gap-2">
                            <div className="bg-white rounded-md p-1.5 flex items-center justify-center h-9 w-14">
                                <PixIcon className="h-full w-auto"/>
                            </div>
                             <div className="bg-white rounded-md p-1.5 flex items-center justify-center h-9 w-14">
                                <VisaIcon className="h-full w-auto"/>
                            </div>
                             <div className="bg-white rounded-md p-1.5 flex items-center justify-center h-9 w-14">
                                <MastercardIcon className="h-full w-auto"/>
                            </div>
                             <div className="bg-white rounded-md p-1.5 flex items-center justify-center h-9 w-14">
                                <EloIcon className="h-full w-auto"/>
                            </div>
                             <div className="bg-white rounded-md p-1.5 flex items-center justify-center h-9 w-14">
                                <BoletoIcon className="h-6 w-auto text-black"/>
                            </div>
                        </div>
                         <p className="text-xs text-gray-500">Parcele em até 4x sem juros.</p>
                    </div>
                </div>
            </div>
            <div className="bg-black py-4 border-t border-gray-800">
                <p className="text-center text-sm text-gray-500">© {new Date().getFullYear()} LovecestasePerfumes. Todos os direitos reservados.</p>
            </div>
        </footer>
      )}
      
      {deferredPrompt && <InstallPWAButton deferredPrompt={deferredPrompt} />}
    </div>
  );
}

export default function App() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    useEffect(() => {
        // --- Configuração PWA ---
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            console.log('`beforeinstallprompt` event foi disparado e está pronto para ser usado.');
        });
        
        // Registra o Service Worker a partir do arquivo estático
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => console.log('Service Worker estático registrado com sucesso:', registration))
                    .catch(error => console.log('Falha no registro do Service Worker estático:', error));
            });
        }

        // --- Carregamento de Scripts Externos ---
        const loadScript = (src, id, callback) => {
            if (document.getElementById(id)) {
                if (callback) callback();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.id = id;
            script.async = true;
            script.onload = () => { if (callback) callback(); };
            document.body.appendChild(script);
        };

        loadScript('https://cdn.jsdelivr.net/npm/chart.js', 'chartjs-script');
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'xlsx-script');
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf-script', () => {
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js', 'jspdf-autotable-script');
        });
        loadScript('https://sdk.mercadopago.com/js/v2', 'mercadopago-sdk');

    }, []);

    return (
        <AuthProvider>
            <NotificationProvider>
                <ConfirmationProvider>
                    <ShopProvider>
                        <AppContent deferredPrompt={deferredPrompt} />
                    </ShopProvider>
                </ConfirmationProvider>
            </NotificationProvider>
        </AuthProvider>
    );
}

