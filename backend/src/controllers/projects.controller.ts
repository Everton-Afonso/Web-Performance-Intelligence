import type { Request, Response } from "express";
import type { Repository } from "../types/storage.js";
import { createProjectSchema } from "../validators/monitoring.schema.js";

export class ProjectsController {
  constructor(private readonly repository: Repository) {}

  async list(_req: Request, res: Response): Promise<void> {
    const projects = await this.repository.listProjects();
    res.json(projects);
  }

  async create(req: Request, res: Response): Promise<void> {
    const { name } = createProjectSchema.parse(req.body);
    const project = await this.repository.createProject(name);
    res.status(201).json(project);
  }

  async get(req: Request, res: Response): Promise<void> {
    const project = await this.repository.getProjectById(req.params.id!);
    if (!project) {
      res.status(404).json({ error: "Projeto não encontrado." });
      return;
    }
    const sites = await this.repository.listSitesByProject(project.id);
    res.json({ ...project, sites });
  }
}