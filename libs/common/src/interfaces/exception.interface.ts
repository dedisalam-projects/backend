export interface HttpExceptionResponseBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  details?: unknown;
  [key: string]: unknown;
}

export interface RpcExceptionResponseBody {
  statusCode?: number;
  message?: string;
  status?: string;
  [key: string]: unknown;
}

export interface WsExceptionResponseBody {
  code?: string;
  message?: string;
  details?: unknown;
  [key: string]: unknown;
}

export interface FormattedErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
  details?: unknown;
  meta: {
    timestamp: string;
    requestId?: string;
  };
}

export interface FormattedWsErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    timestamp: string;
  };
}
