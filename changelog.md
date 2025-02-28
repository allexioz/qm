# Changelog

## [1.1.0] - 2024-03-20

### Added
- Player skill level system (1-5)
  - Level 1: Beginner
  - Level 2: Intermediate
  - Level 3: Advanced
  - Level 4: Expert
  - Level 5: Master

- Visual skill level indicators
  - Color-coded badges for each level
  - Hover tooltips showing level names
  - +/- buttons for level adjustment

- Enhanced matchmaking algorithm
  - Skill level consideration in magic queue
  - Balance between skill matching and wait times
  - Penalties for large skill differences
  - Bonuses for similar skill matches

### Changed
- Player display now shows skill level badge
- Magic queue scoring system updated to include skill factors
- Queue matching now considers player skill levels

### Technical
- Added `skillLevel` property to Player class
- Added `adjustPlayerLevel` method to GameManager
- Enhanced `calculatePlayerScore` to include skill balancing
- Added new CSS styles for skill badges and controls

## [1.0.0] - Initial Release
- Base game functionality
- Court management
- Player queueing
- Magic queue system
- Local storage persistence 