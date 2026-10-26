import nodemailer from 'nodemailer'
import { env } from '@/config/env.config'
import { AppError } from '@/middlewares/error.middleware'

/**
 * Datos para enviar el correo de recuperacion de contrasena.
 */
export interface DatosEmailRestablecimiento {
  /** Correo al que se envia (en este proyecto el username del admin actua como correo). */
  email: string
  /** Nombre con el que se saluda al destinatario. */
  usuario: string
  /** Token firmado con el que el destinatario puede elegir su nueva contrasena. */
  token: string
  /** Base del frontend, sin trazo final: ej. http://localhost:3000 */
  linkBase: string
}

/** Minutos de validez del enlace de recuperacion. */
const VALIDO_HASTA_MINUTOS = 60

/**
 * Envía el correo de recuperación de contraseña.
 *
 * Usa el SMTP de Gmail (nodemailer). La única configuración que pide el
 * proveedor es el host, el puerto, el usuario y la contrasena de aplicación;
 * el texto y el asunto son estáticos.
 */
export async function enviarEmailRestablecimientoPassword(
  datos: DatosEmailRestablecimiento,
): Promise<void> {
  const { email, usuario, token, linkBase } = datos

  const host = env.SMTP_HOST
  const user = env.SMTP_USER
  const pass = env.SMTP_PASS
  const port = env.SMTP_PORT

  if (!host || !user || !pass) {
    throw new AppError(
      'El envio de correos de recuperacion no esta configurado.',
      500,
    )
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  const link = `${linkBase.replace(/\/+$/, '')}/reset-password?token=${token}`

  const texto = [
    `Hola ${usuario},`,
    ``,
    `Solicitaste el cambio de contrasena de tu cuenta en TikTok Live Sales.`,
    ``,
    `Para establecer una nueva contrasena, por favor ingresa al siguiente enlace:`,
    ``,
    link,
    ``,
    `Este enlace tiene una validez de ${VALIDO_HASTA_MINUTOS} minutos.`,
    ``,
    `Si no solicitaste el cambio, por favor ignora este correo.`,
    ``,
    `Saludos,`,
    `TikTok Live Sales`,
  ].join('\n')

  const info = await transporter.sendMail({
    from: `"TikTok Live Sales" <${user}>`,
    to: email,
    subject: 'Restablecimiento de contrasena - TikTok Live Sales',
    text: texto,
  })

  // Confirmacion en consola: si no aparece, el envio fallo antes de llegar aqui.
  console.log(
    `[EMAIL] enviado desde ${user} hacia ${email} (messageId=${info.messageId}, response=${info.response})`,
  )
}
