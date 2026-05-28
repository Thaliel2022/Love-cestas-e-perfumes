import React, { useState, useRef } from 'react';
import { UploadIcon } from '../icons';

export const FileUploadArea = ({ onFileSelect }) => {
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
};

export const DownloadTemplateButton = ({ productType }) => {
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
