export interface NoticeItem {
  id: number;
  title: string;
  body: string;
  imageUrl?: string | null;
  noticeType?: string;
  targetType?: string;
  targetValue?: string | null;
  fcmStatus?: string;
  fcmError?: string | null;
  fcmSentCount?: number;
  status?: string;
  publishedAt?: string | null;
  createdBy?: string;
  createdAt?: string;
  readCount?: number;
  read: boolean;
}

export interface NoticesResponse {
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  items: NoticeItem[];
}

export interface MarkNoticeReadResponse {
  success: boolean;
}
