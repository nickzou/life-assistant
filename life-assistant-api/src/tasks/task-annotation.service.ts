import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TaskAnnotation } from '../database/entities/task-annotation.entity';
import { TIME_OF_DAY_OPTIONS } from '@utils/constants';

@Injectable()
export class TaskAnnotationService {
  private readonly logger = new Logger(TaskAnnotationService.name);

  constructor(
    @InjectRepository(TaskAnnotation)
    private readonly annotationRepository: Repository<TaskAnnotation>,
  ) {}

  async getTimeOfDayAnnotations(
    taskIds: string[],
    source: string,
  ): Promise<Map<string, { name: string; color: string }>> {
    if (taskIds.length === 0) {
      return new Map();
    }

    const annotations = await this.annotationRepository.find({
      where: {
        task_id: In(taskIds),
        source,
      },
    });

    const result = new Map<string, { name: string; color: string }>();

    for (const annotation of annotations) {
      if (annotation.time_of_day) {
        const option = TIME_OF_DAY_OPTIONS.find(
          (o) => o.name === annotation.time_of_day,
        );
        if (option) {
          result.set(annotation.task_id, {
            name: option.name,
            color: option.color,
          });
        }
      }
    }

    return result;
  }

  async setTimeOfDay(
    taskId: string,
    source: string,
    timeOfDay: string | null,
  ): Promise<void> {
    const existing = await this.annotationRepository.findOne({
      where: { task_id: taskId, source },
    });

    if (existing) {
      existing.time_of_day = timeOfDay;
      await this.annotationRepository.save(existing);
    } else {
      await this.annotationRepository.save(
        this.annotationRepository.create({
          task_id: taskId,
          source,
          time_of_day: timeOfDay,
        }),
      );
    }

    this.logger.log(
      `Set time_of_day=${timeOfDay} for task ${taskId} (${source})`,
    );
  }
}
