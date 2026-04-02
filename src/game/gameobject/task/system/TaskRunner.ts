import { TaskStatus } from "./TaskStatus";
import { Task } from "./Task";
export class TaskRunner {
    tick(tasks: Task[], object: any): void {
        this.tickChildren(tasks, object);
    }
    startTask(task: Task, object: any): void {
        if (task.status !== TaskStatus.NotStarted) {
            throw new Error(`Attempted to start a task with status ${task.status}`);
        }
        task.status = TaskStatus.Running;
        task.onStart(object);
    }
    tickTask(task: Task, object: any): boolean {
        let allChildrenFinished = this.tickChildren(task.children, object);
        const blockingChild = task.children.find(child => child.blocking);
        if (!allChildrenFinished && blockingChild)
            return false;
        if (!object.isSpawned)
            return false;
        if (task.status === TaskStatus.NotStarted) {
            throw new Error("Attempted tick on a non-started task");
        }
        if (task.isRunning() || task.isCancelling()) {
            const isCancelling = task.isCancelling();
            let shouldContinue = !!task.waitingForChildrenToFinish || (task as any).onTick(object);
            if (task.children.length && !blockingChild && shouldContinue) {
                allChildrenFinished = task.children.every(child => child.status === TaskStatus.Cancelled || child.status === TaskStatus.Finished);
                task.waitingForChildrenToFinish = !allChildrenFinished;
            }
            shouldContinue = shouldContinue && allChildrenFinished;
            if (shouldContinue) {
                task.onEnd(object);
                task.status = isCancelling ? TaskStatus.Cancelled : TaskStatus.Finished;
            }
            return shouldContinue;
        }
        return true;
    }
    tickChildren(tasks: Task[], object: any): boolean {
        let allFinished = true;
        if (tasks.length) {
            const processedTasks = new Set<Task>();
            let currentTask: Task | undefined;
            while (object.isSpawned && (currentTask = tasks.find(task => !processedTasks.has(task)))) {
                let isFinished: boolean;
                if (currentTask.status === TaskStatus.NotStarted) {
                    this.startTask(currentTask, object);
                }
                if (currentTask.status === TaskStatus.Running || currentTask.status === TaskStatus.Cancelling) {
                    isFinished = this.tickTask(currentTask, object) === true;
                }
                else {
                    if (currentTask.status !== TaskStatus.Cancelled) {
                        throw new Error(`Unhandled task status ${TaskStatus[currentTask.status]}`);
                    }
                    isFinished = true;
                }
                if (isFinished) {
                    const index = tasks.indexOf(currentTask);
                    if (index !== -1) {
                        tasks.splice(index, 1);
                    }
                }
                else {
                    allFinished = false;
                    if (currentTask.blocking)
                        break;
                    processedTasks.add(currentTask);
                }
            }
        }
        return allFinished;
    }
}
