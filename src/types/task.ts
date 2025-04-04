export type TaskStatus = "todo" | "in-progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: Date | null;
    ownerId: string;
    collaborators: string[];
    createdAt: Date;
    updatedAt: Date;
}
