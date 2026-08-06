import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Client Supabase réservé aux scripts d'ingestion (exécutés en local, jamais bundlés).
//
// On utilise la clé `service_role`, qui contourne le RLS : la table `hikes` n'expose
// donc plus aucune policy d'écriture au rôle `anon`.
// Cette clé donne un accès total à la base — elle ne doit jamais apparaître dans le
// code, dans un `EXPO_PUBLIC_*`, ni être commitée.

// Charge .env dans process.env (pas de dépendance dotenv dans ce projet).
function loadEnvFile(): void {
  let content: string;
  try {
    content = fs.readFileSync('.env', 'utf-8');
  } catch {
    return; // pas de .env : on se rabat sur l'environnement du shell
  }
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue; // le shell reste prioritaire
    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, '');
  }
}

loadEnvFile();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} est manquante. Renseigne-la dans .env (voir .env.example) avant de lancer ce script.`
    );
  }
  return value;
}

const supabaseUrl = required('EXPO_PUBLIC_SUPABASE_URL');
const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY');

export const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
