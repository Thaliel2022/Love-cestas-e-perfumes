import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService, apiUploadService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { Modal } from '../../components/ui/Modal';
import { ProductForm } from '../../components/admin/ProductForm';
import { getFirstImage } from '../../utils/cloudinary';
import {
    CheckCircleIcon, CheckIcon, ClockIcon, EditIcon, ExclamationIcon,
    PlusIcon, SaleIcon, SparklesIcon, SpinnerIcon, TrashIcon, UploadIcon,
    XMarkIcon
} from '../../components/icons';

export const AdminProducts = ({ onNavigate }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productFormKey, setProductFormKey] = useState(0);
  const confirmation = useConfirmation();
  const notification = useNotification();
  
  // Estados para Importação Inteligente
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [importMessage, setImportMessage] = useState('');
  
  // Tela de carregamento da importação por IA (percentual 0–100 = fila inteira concluída)
  const [aiLoading, setAiLoading] = useState({
      isOpen: false,
      step: 0,
      percent: 0,
      fileIndex: 0,
      fileTotal: 0,
      currentFileName: '',
      status: 'processing',
  });

  const IMPORT_MAX_FILES = 15;
  const IMPORT_QUEUE_DELAY_MS = 12000;
  const IMPORT_MAX_FILE_BYTES = 15 * 1024 * 1024;

  // Estados para Promoção em Massa
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isBulkPromoModalOpen, setIsBulkPromoModalOpen] = useState(false);
  const [bulkDiscount, setBulkDiscount] = useState(10);
  const [isBulkLimitedTime, setIsBulkLimitedTime] = useState(false);
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [isApplyingBulk, setIsApplyingBulk] = useState(false);
  const [isClearingPromos, setIsClearingPromos] = useState(false); 
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Estado para tela de carregamento de ações em massa normais
  const [bulkProgress, setBulkProgress] = useState({ isRunning: false, text: '' });

  const [searchTerm, setSearchTerm] = useState('');
  const [uniqueBrands, setUniqueBrands] = useState([]);
  const [uniqueCategories, setUniqueCategories] = useState([]);
  const [productType, setProductType] = useState('perfume');
  
  const LOW_STOCK_THRESHOLD = 5;

  // Frases que a IA vai mostrar enquanto trabalha
  const aiSteps = [
      "Iniciando os motores da Inteligência Artificial...",
      "Lendo o documento com Visão Computacional...",
      "Desabreviando nomes e organizando categorias...",
      "IA ocupada? Reconectando automaticamente, sem precisar clicar de novo...",
      "Pesquisando imagens reais dos produtos na internet...",
      "Fazendo upload das fotos e salvando no banco..."
  ];

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
    setProductFormKey((k) => k + 1);
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
                setSearchTerm('');
              } catch(error) {
                notification.show(`Erro ao deletar produto: ${error.message}`, 'error');
              }
          },
          { requiresAuth: true, confirmText: 'Deletar', confirmColor: 'bg-red-600 hover:bg-red-700' }
      );
  };

  // --- Importação Inteligente (IA, XML e SerpAPI) ---
  const handleFileSelect = (e) => {
      const picked = Array.from(e.target.files || []);
      if (!picked.length) return;

      const valid = [];
      const errors = [];

      picked.forEach((file) => {
          if (file.size > IMPORT_MAX_FILE_BYTES) {
              errors.push(`"${file.name}" excede 15MB`);
              return;
          }
          valid.push(file);
      });

      setSelectedFiles((prev) => {
          const merged = [...prev];
          valid.forEach((file) => {
              if (merged.length >= IMPORT_MAX_FILES) return;
              const isDuplicate = merged.some(
                  (f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
              );
              if (!isDuplicate) merged.push(file);
          });
          return merged.slice(0, IMPORT_MAX_FILES);
      });

      if (errors.length) {
          setImportMessage(errors.join(' · '));
      } else {
          setImportMessage('');
      }
      e.target.value = '';
  };

  const removeSelectedFile = (index) => {
      setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getAiStepForPercent = (percent) =>
      Math.min(aiSteps.length - 1, Math.floor((percent / 100) * aiSteps.length));

  const isImportRetryableError = (err) => {
      const msg = String(err?.message || '').toLowerCase();
      return (
          msg.includes('sobrecarregada') ||
          msg.includes('sobrecarregado') ||
          msg.includes('tentou automaticamente') ||
          msg.includes('aguarde') ||
          msg.includes('503') ||
          msg.includes('429') ||
          msg.includes('pausa')
      );
  };

  const handleImportSubmit = async (e) => {
      e.preventDefault();
      if (!selectedFiles.length) {
          setImportMessage('Selecione ao menos um arquivo (PDF, XML ou imagem).');
          return;
      }

      const files = [...selectedFiles];
      const totalFiles = files.length;

      setIsImportModalOpen(false);
      setAiLoading({
          isOpen: true,
          step: 0,
          percent: 0,
          fileIndex: 1,
          fileTotal: totalFiles,
          currentFileName: files[0].name,
          status: 'processing',
      });

      let progressInterval = null;
      const clearImportProgressTimer = () => {
          if (progressInterval) {
              clearInterval(progressInterval);
              progressInterval = null;
          }
      };

      const getSegmentBounds = (fileIndexOneBased) => {
          const start = ((fileIndexOneBased - 1) / totalFiles) * 100;
          const end = (fileIndexOneBased / totalFiles) * 100;
          const max = fileIndexOneBased === totalFiles ? end - 1 : end - 0.5;
          return { start, end, max: Math.max(start, max) };
      };

      const startImportProgressTimer = (segmentMaxPercent) => {
          clearImportProgressTimer();
          progressInterval = setInterval(() => {
              setAiLoading((prev) => {
                  if (!prev.isOpen || prev.percent >= segmentMaxPercent) return prev;
                  let increment = 1.2;
                  if (prev.percent >= 60) increment = 0.7;
                  if (prev.percent >= 75) increment = 0.35;
                  const nextPercent = Math.min(segmentMaxPercent, prev.percent + increment);
                  return {
                      ...prev,
                      percent: nextPercent,
                      step: getAiStepForPercent(nextPercent),
                  };
              });
          }, 350);
      };

      const animateImportProgressTo = (targetPercent, durationMs, fromPercent) =>
          new Promise((resolve) => {
              const start = Date.now();
              const startPercent = fromPercent;
              const timer = setInterval(() => {
                  const elapsed = Date.now() - start;
                  const t = Math.min(1, elapsed / durationMs);
                  const nextPercent = startPercent + (targetPercent - startPercent) * t;
                  setAiLoading((prev) => ({
                      ...prev,
                      percent: nextPercent,
                      step: getAiStepForPercent(nextPercent),
                  }));
                  if (t >= 1) {
                      clearInterval(timer);
                      resolve();
                  }
              }, 120);
          });

      const finishFileProgress = (fileIndexOneBased) =>
          new Promise((resolve) => {
              clearImportProgressTimer();
              const { end } = getSegmentBounds(fileIndexOneBased);
              setAiLoading((prev) => ({
                  ...prev,
                  percent: end,
                  step: aiSteps.length - 1,
                  status: 'processing',
              }));
              setTimeout(resolve, 500);
          });

      const finishAllImportProgress = () =>
          new Promise((resolve) => {
              clearImportProgressTimer();
              setAiLoading((prev) => ({
                  ...prev,
                  percent: 100,
                  step: aiSteps.length - 1,
                  status: 'done',
              }));
              setTimeout(resolve, 900);
          });

      const importSingleInvoice = async (file, fileIndexOneBased) => {
          const { start, max } = getSegmentBounds(fileIndexOneBased);

          clearImportProgressTimer();
          setAiLoading((prev) => ({
              ...prev,
              fileIndex: fileIndexOneBased,
              currentFileName: file.name,
              percent: start,
              status: 'processing',
              step: 0,
          }));
          startImportProgressTimer(max);

          try {
              return await apiUploadService('/products/import-invoice', file);
          } catch (firstError) {
              if (!isImportRetryableError(firstError)) {
                  throw firstError;
              }
              clearImportProgressTimer();
              notification.show(
                  `IA ocupada em "${file.name}". Nova tentativa automática em 20 segundos…`,
                  'success'
              );
              let waitStartPercent = start;
              setAiLoading((prev) => {
                  waitStartPercent = Math.max(prev.percent, start + (max - start) * 0.45);
                  return { ...prev, step: 3, percent: waitStartPercent, status: 'processing' };
              });
              const waitTarget = start + (max - start) * 0.75;
              await animateImportProgressTo(waitTarget, 20000, waitStartPercent);
              startImportProgressTimer(max);
              return await apiUploadService('/products/import-invoice', file);
          }
      };

      const successes = [];
      const failures = [];

      try {
          for (let i = 0; i < files.length; i++) {
              const file = files[i];
              const fileNum = i + 1;

              try {
                  const response = await importSingleInvoice(file, fileNum);
                  successes.push({ name: file.name, message: response.message });
                  await finishFileProgress(fileNum);
              } catch (fileError) {
                  failures.push({
                      name: file.name,
                      message: fileError.message || 'Erro desconhecido',
                  });
                  clearImportProgressTimer();
                  const { end } = getSegmentBounds(fileNum);
                  setAiLoading((prev) => ({
                      ...prev,
                      percent: end,
                      status: 'processing',
                  }));
              }

              if (i < files.length - 1) {
                  const nextNum = fileNum + 1;
                  const waitFrom = getSegmentBounds(fileNum).end;
                  const waitTo = getSegmentBounds(nextNum).start + 0.5;

                  setAiLoading((prev) => ({
                      ...prev,
                      status: 'waiting',
                      step: 3,
                      fileIndex: nextNum,
                      currentFileName: files[i + 1].name,
                  }));

                  await animateImportProgressTo(waitTo, IMPORT_QUEUE_DELAY_MS, waitFrom);
              }
          }

          await finishAllImportProgress();
          fetchProducts();

          if (successes.length && !failures.length) {
              const summary =
                  totalFiles === 1
                      ? successes[0].message
                      : `${successes.length} nota(s) importada(s) com sucesso.`;
              notification.show(summary, 'success');
          } else if (successes.length && failures.length) {
              notification.show(
                  `${successes.length} de ${totalFiles} nota(s) importada(s). Falharam: ${failures.map((f) => f.name).join(', ')}`,
                  'error'
              );
          } else {
              notification.show(
                  failures[0]?.message || 'Nenhuma nota foi importada. Tente novamente.',
                  'error'
              );
          }

          if (successes.length) {
              setSelectedFiles([]);
          }
      } catch (error) {
          notification.show(error.message || 'Erro ao importar as notas. Tente novamente.', 'error');
      } finally {
          clearImportProgressTimer();
          setAiLoading({
              isOpen: false,
              step: 0,
              percent: 0,
              fileIndex: 0,
              fileTotal: 0,
              currentFileName: '',
              status: 'processing',
          });
      }
  };

  // --- Exclusão em Massa ---
  const handleBulkDelete = () => {
      if (selectedProducts.length === 0) return;
      
      confirmation.show(
          `Tem certeza que deseja EXCLUIR permanentemente os ${selectedProducts.length} produto(s) selecionado(s)?`,
          async () => {
              setBulkProgress({ isRunning: true, text: `Excluindo ${selectedProducts.length} produto(s)...` });
              try {
                  await apiService('/products', 'DELETE', { ids: selectedProducts });
                  notification.show(`${selectedProducts.length} produto(s) excluído(s) com sucesso.`);
                  setSearchTerm('');
                  setSelectedProducts([]);
                  fetchProducts();
              } catch (error) {
                  notification.show(`Erro ao excluir produtos: ${error.message}`, 'error');
              } finally {
                  setBulkProgress({ isRunning: false, text: '' });
              }
          },
          { requiresAuth: true, confirmText: 'Excluir Selecionados', confirmColor: 'bg-red-600 hover:bg-red-700' }
      );
  };

  // --- Ativação/Inativação em Massa ---
  const handleBulkStatusUpdate = async (newStatus) => {
      if (selectedProducts.length === 0) return;
      const actionText = newStatus ? 'ATIVAR' : 'INATIVAR';

      confirmation.show(
          `Tem certeza que deseja ${actionText} os ${selectedProducts.length} produto(s) selecionado(s)?`,
          async () => {
              setIsUpdatingStatus(true);
              setBulkProgress({ isRunning: true, text: `${newStatus ? 'Ativando' : 'Inativando'} ${selectedProducts.length} produto(s)...` });
              try {
                  for (const id of selectedProducts) {
                      const product = products.find(p => p.id === id);
                      if (!product) continue;

                      const payload = { ...product, is_active: newStatus ? 1 : 0 };
                      delete payload.avg_rating;
                      delete payload.review_count;
                      delete payload.created_at;

                      const textFields = ['description', 'notes', 'how_to_use', 'ideal_for', 'volume', 'size_guide', 'care_instructions', 'video_url'];
                      textFields.forEach(field => {
                          if (payload[field] === null || payload[field] === undefined) {
                              payload[field] = '';
                          }
                      });

                      if (payload.sale_end_date && payload.sale_end_date !== '') {
                          payload.sale_end_date = new Date(payload.sale_end_date).toISOString();
                      } else {
                          payload.sale_end_date = null;
                      }

                      if (!payload.sale_price) payload.sale_price = null;
                      
                      if (payload.product_type === 'clothing') {
                          if (!payload.variations || payload.variations === 'null') {
                              payload.variations = '[]';
                          } else if (typeof payload.variations === 'object') {
                              payload.variations = JSON.stringify(payload.variations);
                          }
                      } else {
                          payload.variations = '[]';
                      }
                      
                      if (typeof payload.images === 'object') {
                          payload.images = JSON.stringify(payload.images);
                      } else if (!payload.images || payload.images === 'null') {
                          payload.images = '[]';
                      }

                      await apiService(`/products/${id}`, 'PUT', payload);
                  }

                  notification.show(`${selectedProducts.length} produto(s) atualizado(s) com sucesso!`);
                  setSelectedProducts([]);
                  fetchProducts();
              } catch (error) {
                  notification.show(`Erro ao atualizar status: ${error.message}`, 'error');
              } finally {
                  setIsUpdatingStatus(false);
                  setBulkProgress({ isRunning: false, text: '' });
              }
          },
          { requiresAuth: true, confirmText: `Sim, ${actionText}`, confirmColor: newStatus ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700' }
      );
  };

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
      setBulkProgress({ isRunning: true, text: `Aplicando desconto em ${selectedProducts.length} produto(s)...` });
      try {
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
          setBulkProgress({ isRunning: false, text: '' });
      }
  };

  const handleClearSelectedPromotions = () => {
      if (selectedProducts.length === 0) return;

      confirmation.show(
          `Tem certeza que deseja ENCERRAR a promoção de ${selectedProducts.length} produtos selecionados?`,
          async () => {
              setIsClearingPromos(true);
              setBulkProgress({ isRunning: true, text: `Encerrando promoções de ${selectedProducts.length} produto(s)...` });
              try {
                  const result = await apiService('/products/bulk-clear-promo', 'PUT', { productIds: selectedProducts });
                  notification.show(result.message);
                  setSearchTerm(''); 
                  setSelectedProducts([]); 
                  fetchProducts();
              } catch (error) {
                  notification.show(`Erro ao encerrar promoções: ${error.message}`, 'error');
              } finally {
                  setIsClearingPromos(false);
                  setBulkProgress({ isRunning: false, text: '' });
              }
          },
          { requiresAuth: true, confirmText: 'Encerrar Promoções', confirmColor: 'bg-red-600 hover:bg-red-700' }
      );
  };

  const hasInactiveSelected = selectedProducts.some(id => products.find(p => p.id === id)?.is_active === 0);
  const hasActiveSelected = selectedProducts.some(id => products.find(p => p.id === id)?.is_active === 1);

  return (
    <div>
        {/* TELA CHEIA: CARREGAMENTO FUTURISTA DA IA */}
        <AnimatePresence>
            {aiLoading.isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-900/95 backdrop-blur-md"
                >
                    <div className="relative flex items-center justify-center mb-10">
                        {/* Efeitos de brilho e pulso por trás do ícone */}
                        <div className="absolute w-32 h-32 bg-indigo-500 rounded-full animate-ping opacity-20"></div>
                        <div className="absolute w-24 h-24 bg-amber-400 rounded-full animate-pulse opacity-30"></div>
                        <div className="bg-gray-800 p-4 rounded-full relative z-10 border border-gray-700 shadow-[0_0_30px_rgba(212,175,55,0.4)]">
                            <SparklesIcon className="h-14 w-14 text-[#D4AF37] animate-bounce" />
                        </div>
                    </div>
                    
                    <h2 className="text-3xl font-extrabold text-white mb-2 tracking-wider">
                        Gemini AI <span className="text-[#D4AF37]">Operando</span>
                    </h2>

                    {aiLoading.fileTotal > 1 && (
                        <p className="text-indigo-300 font-bold text-lg mb-3">
                            Nota {aiLoading.fileIndex} de {aiLoading.fileTotal}
                        </p>
                    )}

                    {aiLoading.currentFileName && (
                        <p className="text-gray-400 text-sm mb-4 max-w-md truncate px-4" title={aiLoading.currentFileName}>
                            {aiLoading.currentFileName}
                        </p>
                    )}
                    
                    <p className="text-5xl font-black text-white tabular-nums mb-1">
                        {Math.round(aiLoading.percent)}<span className="text-2xl text-gray-400 font-bold">%</span>
                    </p>

                    <div className="h-10 flex items-center justify-center">
                        <motion.p
                            key={
                                aiLoading.percent >= 100
                                    ? 'done'
                                    : aiLoading.status === 'waiting'
                                      ? 'waiting'
                                      : aiLoading.step
                            }
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-[#D4AF37] font-medium text-xl text-center px-6"
                        >
                            {aiLoading.percent >= 100
                                ? aiLoading.fileTotal > 1
                                    ? `Todas as ${aiLoading.fileTotal} notas foram processadas!`
                                    : 'Importação concluída com sucesso!'
                                : aiLoading.status === 'waiting'
                                  ? `Aguardando ${IMPORT_QUEUE_DELAY_MS / 1000}s antes da próxima nota (API gratuita)…`
                                  : aiSteps[aiLoading.step]}
                        </motion.p>
                    </div>

                    <div className="w-80 h-3 bg-gray-800 rounded-full mt-8 overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-indigo-500 via-[#D4AF37] to-indigo-400 rounded-full"
                            initial={false}
                            animate={{ width: `${Math.min(100, Math.max(0, aiLoading.percent))}%` }}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                        />
                    </div>
                    <p className="text-gray-500 text-sm mt-6 text-center max-w-md px-4">
                        {aiLoading.percent >= 100
                            ? 'Processo finalizado. A tela será fechada em instantes.'
                            : aiLoading.fileTotal > 1
                              ? `Fila automática: cada nota é processada em sequência (até ~2 min por nota + ${IMPORT_QUEUE_DELAY_MS / 1000}s de pausa).`
                              : 'Aguarde nesta tela. O percentual sobe conforme a IA processa a nota (pode levar até 2 minutos).'}
                    </p>
                </motion.div>
            )}
        </AnimatePresence>

        {/* OVERLAY DE CARREGAMENTO PADRÃO (Ações em Massa) */}
        <AnimatePresence>
            {bulkProgress.isRunning && !aiLoading.isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm"
                >
                    <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 text-center transform transition-all">
                        <SpinnerIcon className="h-14 w-14 text-indigo-600 mb-5 animate-spin" />
                        <h3 className="text-xl font-extrabold text-slate-800 mb-2">Processando</h3>
                        <p className="text-sm font-medium text-slate-600">{bulkProgress.text}</p>
                        <p className="text-xs text-slate-400 mt-4">Por favor, não feche esta janela.</p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
        
        {/* MODAL DE IMPORTAÇÃO INTELIGENTE (PONTO DE ENTRADA) */}
        <AnimatePresence>
            {isImportModalOpen && (
                <Modal isOpen={true} onClose={() => setIsImportModalOpen(false)} title="Importação Inteligente (IA & XML)">
                    <form onSubmit={handleImportSubmit} className="space-y-4">
                        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
                            <h4 className="font-bold text-indigo-800 flex items-center gap-2 mb-2">
                                <SparklesIcon className="h-5 w-5"/> Como funciona?
                            </h4>
                            <p className="text-sm text-indigo-700 leading-relaxed">
                                Envie um ou <strong>vários arquivos</strong> (XML, PDF ou imagem). As notas entram em <strong>fila</strong>: a IA processa uma, finaliza, pausa {IMPORT_QUEUE_DELAY_MS / 1000}s e segue para a próxima — ideal para o plano gratuito do Google.
                            </p>
                        </div>
                        
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors relative overflow-hidden group">
                            <input 
                                type="file" 
                                id="invoice-upload"
                                accept=".xml,.pdf,image/png,image/jpeg,image/webp"
                                multiple
                                onChange={handleFileSelect}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="flex flex-col items-center justify-center pointer-events-none">
                                <UploadIcon className={`h-12 w-12 mb-3 transition-colors ${selectedFiles.length ? 'text-green-500' : 'text-gray-400 group-hover:text-indigo-500'}`} />
                                <span className="text-sm font-bold text-indigo-600 underline decoration-indigo-300">
                                    {selectedFiles.length
                                        ? 'Adicionar mais arquivos à fila'
                                        : 'Clique ou arraste um ou vários arquivos'}
                                </span>
                                <span className="text-xs text-gray-500 mt-2 font-medium">
                                    PDF, XML, JPG ou PNG · Máx. 15MB cada · Até {IMPORT_MAX_FILES} notas
                                </span>
                            </div>
                        </div>

                        {importMessage && (
                            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{importMessage}</p>
                        )}

                        <AnimatePresence>
                            {selectedFiles.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-2 max-h-48 overflow-y-auto"
                                >
                                    <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wide px-1">
                                        <span>Fila ({selectedFiles.length} nota{selectedFiles.length > 1 ? 's' : ''})</span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedFiles([])}
                                            className="text-red-600 hover:text-red-800 normal-case"
                                        >
                                            Limpar tudo
                                        </button>
                                    </div>
                                    {selectedFiles.map((file, index) => (
                                        <motion.div
                                            key={`${file.name}-${file.size}-${file.lastModified}`}
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 8 }}
                                            className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 font-semibold flex items-center justify-between shadow-sm gap-2"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-xs text-green-600 font-black w-5 flex-shrink-0">{index + 1}.</span>
                                                <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-green-600" />
                                                <span className="truncate" title={file.name}>{file.name}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); removeSelectedFile(index); }}
                                                className="text-green-600 hover:text-red-600 flex-shrink-0"
                                                aria-label={`Remover ${file.name}`}
                                            >
                                                <XMarkIcon className="h-5 w-5" />
                                            </button>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
                            <button type="button" onClick={() => setIsImportModalOpen(false)} className="px-5 py-2.5 bg-gray-200 rounded-lg font-bold text-gray-700 hover:bg-gray-300 transition-colors">Cancelar</button>
                            <button type="submit" disabled={!selectedFiles.length} className="px-6 py-2.5 bg-[#D4AF37] text-black rounded-lg font-bold hover:bg-yellow-500 disabled:bg-gray-300 disabled:text-gray-500 flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 min-w-[200px]">
                                <SparklesIcon className="h-5 w-5" />
                                {selectedFiles.length > 1
                                    ? `Importar ${selectedFiles.length} notas`
                                    : 'Iniciar importação'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </AnimatePresence>

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
                            <button type="button" onClick={() => setIsBulkPromoModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50" disabled={isApplyingBulk}>Cancelar</button>
                            <button type="submit" disabled={isApplyingBulk} className="px-6 py-2 bg-amber-500 text-black font-bold rounded-md hover:bg-amber-400 flex items-center gap-2 disabled:opacity-50">
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
                        key={productFormKey}
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
                <button onClick={() => { setSelectedFiles([]); setImportMessage(''); setIsImportModalOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center space-x-2 shadow-sm transition-colors">
                    <SparklesIcon className="h-5 w-5"/> <span>Importar com IA</span>
                </button>
                <button onClick={() => handleOpenModal()} className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900 flex items-center space-x-2 shadow-sm transition-colors">
                    <PlusIcon className="h-5 w-5"/> <span>Novo Produto</span>
                </button>
            </div>
        </div>

        {/* --- BARRA DE AÇÕES EM MASSA FLUTUANTE --- */}
        <AnimatePresence>
            {selectedProducts.length > 0 && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg mb-6 flex flex-wrap items-center justify-between gap-3 sticky top-16 z-20 shadow-md"
                >
                    <div className="text-sm font-bold text-indigo-800 flex items-center gap-2">
                        <span className="bg-indigo-200 text-indigo-900 px-2.5 py-0.5 rounded-full">{selectedProducts.length}</span>
                        itens selecionados
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {hasInactiveSelected && (
                            <button onClick={() => handleBulkStatusUpdate(true)} disabled={isUpdatingStatus} className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700 flex items-center gap-1 shadow-sm disabled:opacity-50">
                                <CheckIcon className="h-3 w-3"/> Ativar
                            </button>
                        )}
                        {hasActiveSelected && (
                            <button onClick={() => handleBulkStatusUpdate(false)} disabled={isUpdatingStatus} className="px-3 py-1.5 bg-gray-600 text-white text-xs font-bold rounded hover:bg-gray-700 flex items-center gap-1 shadow-sm disabled:opacity-50">
                                <XMarkIcon className="h-3 w-3"/> Inativar
                            </button>
                        )}
                        <button onClick={() => setIsBulkPromoModalOpen(true)} disabled={isApplyingBulk} className="px-3 py-1.5 bg-amber-500 text-black text-xs font-bold rounded hover:bg-amber-400 flex items-center gap-1 shadow-sm disabled:opacity-50">
                            <SaleIcon className="h-3 w-3"/> Promoção
                        </button>
                        <button onClick={handleClearSelectedPromotions} disabled={isClearingPromos} className="px-3 py-1.5 bg-orange-600 text-white text-xs font-bold rounded hover:bg-orange-700 flex items-center gap-1 shadow-sm disabled:opacity-50">
                            <XMarkIcon className="h-3 w-3"/> Encerrar Promo
                        </button>
                        <button onClick={handleBulkDelete} disabled={bulkProgress.isRunning} className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 flex items-center gap-1 shadow-sm disabled:opacity-50">
                            <TrashIcon className="h-3 w-3"/> Excluir
                        </button>
                        <button onClick={() => setSelectedProducts([])} disabled={bulkProgress.isRunning} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 text-xs font-bold rounded hover:bg-gray-100 shadow-sm ml-1 disabled:opacity-50">
                            Cancelar
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
        
        <div className="mb-6">
            <input 
                type="text" 
                name="search_products_no_autofill" 
                autoComplete="new-password" 
                spellCheck="false"
                data-lpignore="true"
                data-form-type="other"
                placeholder="Pesquisar por nome, marca ou categoria..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
        </div>

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
            {/* --- VERSÃO DESKTOP --- */}
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
                            <th className="p-4">Vendas</th>
                            <th className="p-4">Estoque</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(p => {
                            const isTimeLimited = p.is_on_sale && p.sale_end_date && new Date(p.sale_end_date).getTime() > new Date().getTime();
                            
                            return (
                                <tr key={p.id} className={`border-b ${selectedProducts.includes(p.id) ? 'bg-indigo-50' : ''} ${p.stock < LOW_STOCK_THRESHOLD ? 'bg-red-50' : ''}`}>
                                    <td className="p-4"><input type="checkbox" checked={selectedProducts.includes(p.id)} onChange={() => handleSelectProduct(p.id)} className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500" /></td>
                                    <td className="p-4 flex items-center">
                                        <div className="w-10 h-10 mr-4 flex-shrink-0 bg-gray-200 rounded-md flex items-center justify-center">
                                            <img src={getFirstImage(p.images, 'https://placehold.co/40x40/222/fff?text=Img')} className="max-h-full max-w-full object-contain" alt={p.name}/>
                                        </div>
                                        <div>
                                            <p className="font-semibold">{p.name}</p>
                                            <p className="text-xs text-gray-500">{p.brand}</p>
                                        </div>
                                    </td>
                                    <td className="p-4 capitalize">
                                        {p.product_type === 'clothing' ? 'Roupa' : (p.product_type === 'perfume' ? 'Perfume' : p.product_type)}
                                    </td>
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
                                    <td className="p-4 font-semibold text-gray-700">
                                        {p.sales || 0}
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
            
            {/* --- VERSÃO MOBILE DO ADMIN --- */}
            <div className="md:hidden">
                <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
                     <label className="flex items-center gap-3 font-bold text-gray-700">
                        <input type="checkbox" onChange={handleSelectAll} checked={filteredProducts.length > 0 && selectedProducts.length === filteredProducts.length} className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        Selecionar Todos
                     </label>
                     <span className="text-xs text-gray-500">{filteredProducts.length} itens</span>
                </div>

                <div className="space-y-4 p-4">
                    {filteredProducts.map(p => {
                        const isTimeLimited = p.is_on_sale && p.sale_end_date && new Date(p.sale_end_date).getTime() > new Date().getTime();
                        return (
                            <div key={p.id} className={`bg-white border rounded-lg p-4 shadow-sm transition-colors ${selectedProducts.includes(p.id) ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-400' : ''}`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center">
                                        <input type="checkbox" checked={selectedProducts.includes(p.id)} onChange={() => handleSelectProduct(p.id)} className="mr-4 h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                                        <img src={getFirstImage(p.images, 'https://placehold.co/40x40/222/fff?text=Img')} className="h-14 w-14 object-contain mr-3 bg-gray-100 rounded"/>
                                        <div>
                                            <p className="font-bold text-gray-900 line-clamp-1">{p.name}</p>
                                            <p className="text-sm text-gray-500">{p.brand}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col items-end gap-1">
                                         <span className="bg-indigo-100 text-indigo-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase whitespace-nowrap">
                                             {p.product_type === 'clothing' ? 'Roupa' : (p.product_type === 'perfume' ? 'Perfume' : p.product_type)}
                                         </span>
                                         <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold uppercase whitespace-nowrap ${p.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                                             {p.is_active ? 'Ativo' : 'Inativo'}
                                         </span>
                                         {!!p.is_on_sale && (
                                             <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase whitespace-nowrap">Promo</span>
                                         )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mt-4 text-sm border-t pt-4">
                                    <div>
                                        <strong className="text-gray-500 block text-xs uppercase tracking-wide mb-1">Preço</strong> 
                                        {!!p.is_on_sale && p.sale_price > 0 ? (
                                            <div className="flex flex-col">
                                                <span className="text-red-600 font-bold text-lg">R$ {Number(p.sale_price).toFixed(2)}</span>
                                                <span className="text-gray-400 text-xs line-through">R$ {Number(p.price).toFixed(2)}</span>
                                                {isTimeLimited && (
                                                    <div className="flex items-center gap-1 mt-1 bg-red-50 px-1.5 py-0.5 rounded w-fit">
                                                        <ClockIcon className="h-3 w-3 text-red-500"/>
                                                        <AdminCountdown endDate={p.sale_end_date} />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="font-bold text-gray-800">R$ {Number(p.price).toFixed(2)}</span>
                                        )}
                                    </div>
                                    <div>
                                        <strong className="text-gray-500 block text-xs uppercase tracking-wide mb-1">Vendas</strong> 
                                        <div className="font-bold text-gray-800">
                                            {p.sales || 0} un.
                                        </div>
                                    </div>
                                    <div>
                                        <strong className="text-gray-500 block text-xs uppercase tracking-wide mb-1">Estoque</strong> 
                                        <div className={`font-bold ${p.stock < LOW_STOCK_THRESHOLD ? 'text-red-600 flex items-center gap-1' : 'text-gray-800'}`}>
                                            {p.stock < LOW_STOCK_THRESHOLD && <ExclamationIcon className="h-4 w-4"/>}
                                            {p.stock} un.
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-2 mt-4 pt-2 border-t">
                                    <button onClick={() => handleOpenModal(p)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 font-medium text-xs"><EditIcon className="h-4 w-4"/> Editar</button>
                                    <button onClick={() => handleDelete(p.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded hover:bg-red-100 font-medium text-xs"><TrashIcon className="h-4 w-4"/> Excluir</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    </div>
  )
};
