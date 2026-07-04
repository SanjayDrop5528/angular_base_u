import { Injectable, inject } from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../../../environments/environment';
import { HelperService } from '../../../../core/services/utils/helper.service';

@Injectable({
  providedIn: 'root'
})
export class FilePreviewService {
  private readonly FILE_TYPES = {
    IMAGE: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'],
    DOCUMENT: ['doc', 'docx'],
    PDF: ['pdf'],
    TEXT: ['txt'],
    VIDEO: ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv']
  };
  baseFileUrl: string;
  private helperService = inject(HelperService);

  constructor() {
    this.baseFileUrl = environment.ImageBaseUrl;
  }

  getFileIcon(file: any): { preview: string, type: string } {
    if (!file?.storage_name) return { preview: 'assets/svgs/file.svg', type: 'other' };

    const extension = file.file_name.split('.').pop()?.toLowerCase() || '';

    if (this.FILE_TYPES.PDF.includes(extension)) {
      return { preview: 'assets/svgs/pdf.svg', type: 'pdf' };
    } else if (this.FILE_TYPES.DOCUMENT.includes(extension)) {
      return { preview: 'assets/svgs/doc.svg', type: 'doc' };
    } else if (this.FILE_TYPES.TEXT.includes(extension)) {
      return { preview: 'assets/svgs/text.svg', type: 'txt' };
    } else if (this.FILE_TYPES.IMAGE.includes(extension)) {
      return { preview: `${this.baseFileUrl + file.storage_name}`, type: 'image' };
    } else if (this.FILE_TYPES.VIDEO.includes(extension)) {
      return { preview: 'assets/svgs/video.svg', type: 'video' };
    }

    return { preview: 'assets/svgs/file.svg', type: 'other' };
  }

  getSafeUrl(file: any, type: string): SafeResourceUrl {
    let storageName = file.storage_name || '';
    let fileUrl = '';
    
    if (storageName.startsWith('http://') || storageName.startsWith('https://')) {
      fileUrl = storageName;
    } else {
      const baseUrl = this.baseFileUrl || '';
      const prefix = baseUrl.endsWith('/') ? baseUrl : (baseUrl + '/');
      fileUrl = `${prefix}${storageName}`;
    }

    switch (type) {
      case 'pdf':
      case 'doc':
      case 'docx':
        const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
        return this.helperService.bypassSecurityTrustResourceUrl(viewerUrl);
      case 'image':
        return this.helperService.bypassSecurityTrustResourceUrl(fileUrl);
      case 'video':
        return this.helperService.bypassSecurityTrustResourceUrl(fileUrl);
      default:
        return this.helperService.bypassSecurityTrustResourceUrl('');
    }
  }

  async loadTextFileContent(storageName: string): Promise<string> {
    try {
      const fileUrl = `${this.baseFileUrl}/${storageName}`;
      const response = await fetch(fileUrl);
      return await response.text();
    } catch (error) {
      console.error('Error loading text file:', error);
      return 'Could not load text content';
    }
  }
}