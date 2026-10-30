export enum LOG_NAME {
  // Technical breadcrumb of a background step, used to debug complaints
  debug_log = 'debug_log',
  // Non-failure notice, split by `type`: a fallback that worked, a stale status that was ignored
  warning_log = 'warning_log',
  // Any caught failure, split by `type`, with the failure class in `error_kind`
  error_log = 'error_log',
  // The import operation moved to another phase
  import_phase_changed = 'import_phase_changed'
}

export enum LOG_TYPE {
  // Every POST of a statement, the first one and every repeat with the same key
  create_import = 'create_import',
  // Lookup of a job by its idempotency key after a lost answer
  recover_by_key = 'recover_by_key',
  // Status read of a known job
  poll_job = 'poll_job',
  // Deletion of an import on the server
  delete_import = 'delete_import',
  // Deletion on the server of an upload that was cancelled before its outcome was known
  cleanup_upload = 'cleanup_upload',
  // Picking, copying and checking a statement file before any network
  pick_file = 'pick_file',
  // Reading the size, the first bytes or the presence of our private copy of a statement
  read_copy = 'read_copy',
  // Deleting our private copy of a statement or the copies the file picker left behind
  remove_copy = 'remove_copy',
  // Reading the stored operation at launch
  restore_operation = 'restore_operation',
  // Loading the brand fonts at launch
  load_fonts = 'load_fonts',
  // Hiding the native splash screen
  hide_splash = 'hide_splash',
  // Painting the native root view in the theme background
  system_background = 'system_background',
  // A call to the mock's test routes from the diagnostics screen
  mock_control = 'mock_control',
  // Forgetting the import on this phone from the diagnostics screen
  reset_all = 'reset_all'
}
