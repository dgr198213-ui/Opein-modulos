import { ElementInst, ModuleInst, Partition, ViewTab } from '@/lib/types';

const STORAGE_KEY = 'opein-configurador:projects:v1';
const FALLBACK_PROJECT_NAME = 'Proyecto sin título';

export interface ProjectSnapshot {
  modules: ModuleInst[];
  partitions: Partition[];
  elements: ElementInst[];
  tab: ViewTab;
}

export interface LocalProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  snapshot: ProjectSnapshot;
}

function isProjectSnapshot(value: unknown): value is ProjectSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Record<string, unknown>;
  return Array.isArray(snapshot.modules)
    && Array.isArray(snapshot.partitions)
    && Array.isArray(snapshot.elements)
    && (snapshot.tab === 'plan' || snapshot.tab === 'elev');
}

function isLocalProject(value: unknown): value is LocalProject {
  if (!value || typeof value !== 'object') return false;
  const project = value as Record<string, unknown>;
  return typeof project.id === 'string'
    && typeof project.name === 'string'
    && typeof project.createdAt === 'string'
    && typeof project.updatedAt === 'string'
    && isProjectSnapshot(project.snapshot);
}

function copySnapshot(snapshot: ProjectSnapshot): ProjectSnapshot {
  return {
    modules: snapshot.modules.map((module) => ({ ...module, walls: { ...module.walls } })),
    partitions: snapshot.partitions.map((partition) => ({ ...partition })),
    elements: snapshot.elements.map((element) => ({ ...element })),
    tab: snapshot.tab,
  };
}

function readProjects(): LocalProject[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(isLocalProject)
      .map((project) => ({ ...project, snapshot: copySnapshot(project.snapshot) }))
      .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
  } catch {
    return [];
  }
}

function writeProjects(projects: LocalProject[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function createProjectId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `project-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normaliseName(name: string): string {
  return name.trim().slice(0, 80) || FALLBACK_PROJECT_NAME;
}

export function listLocalProjects(): LocalProject[] {
  return readProjects();
}

export function saveLocalProject(
  name: string,
  snapshot: ProjectSnapshot,
  existingId?: string,
): LocalProject {
  const projects = readProjects();
  const existing = existingId ? projects.find((project) => project.id === existingId) : undefined;
  const now = new Date().toISOString();
  const project: LocalProject = {
    id: existing?.id ?? createProjectId(),
    name: normaliseName(name),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    snapshot: copySnapshot(snapshot),
  };

  const nextProjects = existing
    ? projects.map((candidate) => (candidate.id === project.id ? project : candidate))
    : [project, ...projects];
  writeProjects(nextProjects);
  return project;
}

export function deleteLocalProject(id: string): void {
  writeProjects(readProjects().filter((project) => project.id !== id));
}
