# Changelog

## Version 0.6

- **Feature**: telemetry benefits of the pioneer infrastructure
- **Settings**:
  - remove the `local` setting parameter
  - add a `learningobject` parameter, setting the metadata we want to use as
    learning object identifier in the learning trace

### Version 0.5.2

- **Bugfix**: fix tag value read as Object

## Version 0.5

- **Settings**: specify which kind of output type we want to track

### Version 0.4.5

- **Bugfix**: fix `local` setting

### Version 0.4.4

- **Feature**: add timestamp to the learning trace
- **Bugfix**: learning traces are jsonlines files
- **Bugfix**: remnants blank spaces removed from recursive tags

### Version 0.4.3

- **Bugfix**: correctly manage the absence of the learning tag in a cell

### Version 0.4.2

- **Settings**: change default local configuration to `true`

### Version 0.4.1

- **Bugfix**: learning traces files can be appended

## Version 0.4

- **Feature**: add local configuration

## Version 0.3

- **Bugfix**: fix trace generation when no custom tags are recorded.
- **Feature**: add trace file name to the settings
