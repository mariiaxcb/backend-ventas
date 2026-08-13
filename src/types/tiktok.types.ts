export interface TiktokComentarioEvento {
  usuarioTiktok: string;
  mensaje: string;
  timestamp: string;
}

export interface TiktokPostulanteEvento {
  usuarioTiktok: string;
  productoId: string;
  timestamp: string;
}

export interface TiktokLiveConfig {
  roomId: string;
  uniqueId: string;
}
