import path from 'path'
import dotenv from 'dotenv'

/** Directory that contains backend/.env (works from src/ and dist/). */
export const backendRoot = path.join(__dirname, '..')

dotenv.config({ path: path.join(backendRoot, '.env') })
