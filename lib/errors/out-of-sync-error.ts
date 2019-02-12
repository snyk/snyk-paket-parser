export class OutOfSyncError extends Error {
  public code = 422;
  public name = 'OutOfSyncError';
  public dependencyName: string;
  public lockFileType: string;

  constructor(dependencyName: string) {
    super(`Dependency ${dependencyName} was not found in paket.lock. Your ` +
      'paket.dependencies and paket.lock are probably out of sync. Please ' +
      'run "paket install" and try again.');
    this.dependencyName = dependencyName;
    Error.captureStackTrace(this, OutOfSyncError);
  }
}
