import React, { useState } from 'react';
import './FileManager.css';

const FileManager = ({ apiService }) => {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileUpload = async (event) => {
    const uploadedFiles = Array.from(event.target.files);
    setIsUploading(true);

    for (const file of uploadedFiles) {
      const fileData = {
        id: Date.now() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadDate: new Date(),
        status: 'uploading'
      };

      setFiles(prev => [...prev, fileData]);

      if (apiService) {
        try {
          const result = await apiService.uploadFileToApi(file, file.name, file.type);
          if (result.success) {
            setFiles(prev => prev.map(f => 
              f.id === fileData.id 
                ? { ...f, status: 'uploaded', apiId: result.fileId }
                : f
            ));
          } else {
            setFiles(prev => prev.map(f => 
              f.id === fileData.id 
                ? { ...f, status: 'error', error: result.error }
                : f
            ));
          }
        } catch (error) {
          setFiles(prev => prev.map(f => 
            f.id === fileData.id 
              ? { ...f, status: 'error', error: error.message }
              : f
          ));
        }
      } else {
        // Demo mode
        setTimeout(() => {
          setFiles(prev => prev.map(f => 
            f.id === fileData.id 
              ? { ...f, status: 'uploaded' }
              : f
          ));
        }, 1000);
      }
    }

    setIsUploading(false);
    event.target.value = '';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎥';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    if (type.includes('powerpoint') || type.includes('presentation')) return '📈';
    if (type.includes('zip') || type.includes('rar')) return '📦';
    return '📁';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'uploading': return '⏳';
      case 'uploaded': return '✅';
      case 'error': return '❌';
      default: return '📄';
    }
  };

  return (
    <div className="file-manager">
      <div className="file-manager-header">
        <h2>📁 File Manager</h2>
        <p>Upload and manage your files with Robbi</p>
      </div>

      <div className="upload-section">
        <label className="upload-button">
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            disabled={isUploading}
            style={{ display: 'none' }}
          />
          <span className="upload-icon">📤</span>
          {isUploading ? 'Uploading...' : 'Upload Files'}
        </label>
      </div>

      <div className="files-list">
        {files.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📂</span>
            <h3>No files uploaded yet</h3>
            <p>Upload files to get started with Robbi's file analysis</p>
          </div>
        ) : (
          files.map(file => (
            <div 
              key={file.id} 
              className={`file-item ${selectedFile?.id === file.id ? 'selected' : ''}`}
              onClick={() => setSelectedFile(file)}
            >
              <div className="file-icon">
                {getFileIcon(file.type)}
              </div>
              <div className="file-info">
                <div className="file-name">{file.name}</div>
                <div className="file-details">
                  {formatFileSize(file.size)} • {file.uploadDate.toLocaleDateString()}
                </div>
                {file.error && (
                  <div className="file-error">{file.error}</div>
                )}
              </div>
              <div className="file-status">
                {getStatusIcon(file.status)}
              </div>
            </div>
          ))
        )}
      </div>

      {selectedFile && (
        <div className="file-details-panel">
          <h3>File Details</h3>
          <div className="detail-row">
            <span className="detail-label">Name:</span>
            <span className="detail-value">{selectedFile.name}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Size:</span>
            <span className="detail-value">{formatFileSize(selectedFile.size)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Type:</span>
            <span className="detail-value">{selectedFile.type || 'Unknown'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Status:</span>
            <span className="detail-value">{selectedFile.status}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Uploaded:</span>
            <span className="detail-value">{selectedFile.uploadDate.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileManager;