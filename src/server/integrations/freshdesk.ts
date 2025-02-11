import jwt from 'jsonwebtoken';
import { env } from '~/env/server';
import { dbWrite } from '~/server/db/client';
import { logToAxiom } from '~/server/logging/client';
import { toBase64 } from '~/utils/string-helpers';

export async function createFreshdeskToken(
  user: { id?: number; username?: string; email?: string },
  nonce: string
) {
  if (!env.FRESHDESK_JWT_SECRET) return;
  if (!user.id || !user.username || !user.email) return;

  createContact(user);

  const body = {
    sub: `civitai-${user.id}`,
    email: user.email,
    iat: Math.floor(Date.now() / 1000),
    nonce,
    given_name: user.username,
    family_name: 'Civitan',
  };

  return jwt.sign(body, env.FRESHDESK_JWT_SECRET.replace(/\\n/g, '\n'), {
    algorithm: 'RS256',
  });
}

type FreshdeskConflictResponse = {
  description: string;
  errors: {
    field: string | null;
    additional_info: {
      user_id: number;
    };
    message: string;
    code: string;
  }[];
};
type FreshdeskUserInput = { id?: number; username?: string; email?: string; tier?: string };

export async function createContact(user: FreshdeskUserInput) {
  if (!env.FRESHDESK_TOKEN || !env.FRESHDESK_DOMAIN) return;
  if (!user.id || !user.username || !user.email) return;

  try {
    const response = await fetch(`${env.FRESHDESK_DOMAIN}/api/v2/contacts`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${toBase64(`${env.FRESHDESK_TOKEN}:X`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        active: true,
        name: user.username,
        email: user.email,
        unique_external_id: `civitai-${user.id}`,
      }),
    });

    if (!response.ok) {
      if (response.status === 409) {
        const data: FreshdeskConflictResponse = await response.json();
        if (data.errors[0].code === 'duplicate_value') {
          return data.errors[0].additional_info.user_id;
        } else return;
      }
      logToAxiom(
        {
          name: 'freshdesk',
          type: 'error',
          statusCode: response.status,
          message: await response.text(),
        },
        'civitai-prod'
      );
    }
  } catch (error) {
    logToAxiom(
      {
        name: 'freshdesk',
        type: 'error',
        statusCode: 500,
        message: (error as Error).message,
      },
      'civitai-prod'
    );
  }
}

export async function updateContact(user: FreshdeskUserInput & { contactId: number }) {
  if (!env.FRESHDESK_TOKEN || !env.FRESHDESK_DOMAIN) return;

  try {
    const response = await fetch(`${env.FRESHDESK_DOMAIN}/api/v2/contacts/${user.contactId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Basic ${toBase64(`${env.FRESHDESK_TOKEN}:X`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: user.username,
        custom_fields: {
          sla: user.tier,
        },
      }),
    });

    if (!response.ok) {
      logToAxiom(
        {
          name: 'freshdesk',
          type: 'error',
          statusCode: response.status,
          message: await response.text(),
        },
        'civitai-prod'
      );
    }
  } catch (error) {
    logToAxiom(
      {
        name: 'freshdesk',
        type: 'error',
        statusCode: 500,
        message: (error as Error).message,
      },
      'civitai-prod'
    );
  }
}

export async function upsertContact(user: FreshdeskUserInput) {
  const contactId = await createContact(user);
  if (contactId) await updateContact({ ...user, contactId });
}

export async function updateServiceTier(
  userId: number,
  serviceTier: 'Supporter' | 'Bronze' | 'Silver' | 'Gold' | undefined
) {
  const { email } =
    (await dbWrite.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })) ?? {};
  if (!email) return;

  return upsertContact({ email, tier: serviceTier });
}
