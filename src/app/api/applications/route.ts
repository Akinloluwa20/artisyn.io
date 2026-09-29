import { promises as fs } from 'fs';
import path from 'path';

interface Application {
  id: string;
  jobTitle: string;
  applicant: string;
  payload: unknown;
  createdAt: string;
  [key: string]: unknown;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { jobTitle, applicant } = body;
    if (!jobTitle || !applicant) {
      return new Response(JSON.stringify({ message: 'Missing required fields' }), { status: 400 });
    }

    const dataDir = path.join(process.cwd(), 'data');
    const dataPath = path.join(dataDir, 'applications.json');
    await fs.mkdir(dataDir, { recursive: true });

    let apps: Application[] = [];
    try {
      const raw = await fs.readFile(dataPath, 'utf8');
      apps = JSON.parse(raw || '[]') as Application[];
    } catch {
      apps = [];
    }

    const duplicate = apps.find((a) => a.jobTitle === jobTitle && a.applicant === applicant);
    if (duplicate) {
      return new Response(JSON.stringify({ message: 'Duplicate application' }), { status: 409 });
    }

    const record = {
      id: `${Date.now()}`,
      jobTitle,
      applicant,
      payload: body,
      createdAt: new Date().toISOString(),
    };

    apps.push(record);
    await fs.writeFile(dataPath, JSON.stringify(apps, null, 2), 'utf8');

    return new Response(JSON.stringify(record), { status: 201 });
  } catch {
    return new Response(JSON.stringify({ message: 'Server error' }), { status: 500 });
  }
}

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'applications.json');
    const raw = await fs.readFile(dataPath, 'utf8');
    const apps = JSON.parse(raw || '[]') as Application[];
    return new Response(JSON.stringify(apps), { status: 200 });
  } catch {
    return new Response(JSON.stringify([]), { status: 200 });
  }

}

export async function PATCH(req: Request) {
  try {
    const { id, status } = await req.json();
    if (!id || !['pending', 'accepted', 'rejected'].includes(status)) {
      return new Response(JSON.stringify({ message: 'Invalid id or status' }), { status: 400 });
    }

    const dataPath = path.join(process.cwd(), 'data', 'applications.json');
    let apps: Application[] = [];
    try {
      apps = JSON.parse((await fs.readFile(dataPath, 'utf8')) || '[]') as Application[];
    } catch {
      apps = [];
    }

    const app = apps.find((a) => a.id === id);
    if (!app) {
      return new Response(JSON.stringify({ message: 'Application not found' }), { status: 404 });
    }

    app.status = status;
    await fs.writeFile(dataPath, JSON.stringify(apps, null, 2), 'utf8');

    return new Response(JSON.stringify(app), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ message: 'Server error' }), { status: 500 });
  }
}
