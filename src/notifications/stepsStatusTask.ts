// Defines the background task that refreshes the steps notification. Must run when the
// JavaScript bundle loads (index.js), before Android asks for the task.

import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { openWidgetDatabase } from '../widget/widgetData';
import { refreshStepsStatus, STEPS_STATUS_TASK } from './stepsStatus';

TaskManager.defineTask(STEPS_STATUS_TASK, async () => {
  try {
    await refreshStepsStatus(await openWidgetDatabase());
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});
