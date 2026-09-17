export interface TiktokComentarioEvento {
  usuarioTiktok: string;
  mensaje: string;
  timestamp: string;
}

export interface TiktokPostulanteEvento {
  usuarioTiktok: string;
  nickname?: string;
  productoId: string;
  productoNombre?: string;
  comentario?: string;
  timestamp: string;
  reservados?: number;
  limite?: number;
  stock?: number;
}

export interface TiktokLiveConfig {
  roomId: string;
  uniqueId: string;
}
