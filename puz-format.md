Puz format

Header
| Component          | Offset       | End       | Length       | Type       | Description                                                                               |
| :--------------    | :----------- | :-------- | :----------- | :--------- | :----------------                                                                         |
| Checksum           | 0x00         | 0x01      | 0x2          | short      | overall file checksum                                                                     |
| File Magic         | 0x02         | 0x0D      | 0xC          | string     | NUL-terminated constant string: 4143 524f 5353 2644 4f57 4e00 ("ACROSS&DOWN")             |
| Version String(?)  | 0x18         | 0x1B      | 0x4          | string     | e.g. "1.2\0"                                                                              |
| Reserved1C(?)      | 0x1C         | 0x1D      | 0x2          | ?          | In many files, this is uninitialized memory                                               |
| Scrambled Checksum | 0x1E         | 0x1F      | 0x2          | short      | In scrambled puzzles, a checksum of the real solution (details below). Otherwise, 0x0000. |
| Reserved20(?)      | 0x20         | 0x2B      | 0xC          | ?          | In files where Reserved1C is garbage, this is garbage too.                                |
| Width              | 0x2C         | 0x2C      | 0x1          | byte       | The width of the board                                                                    |
| Height             | 0x2D         | 0x2D      | 0x1          | byte       | The height of the board                                                                   |
| # of Clues         | 0x2E         | 0x2F      | 0x2          | short      | The number of clues for this board                                                        |
| Unknown Bitmask    | 0x30         | 0x31      | 0x2          | short      | A bitmask. Operations unknown.                                                            |
| Scrambled Tag      | 0x32         | 0x33      | 0x2          | short      | 0 for unscrambled puzzles. Nonzero (often 4) for scrambled puzzles.                       |

Answers

Player board state

String block
| Description   | Example            |
| :------------ | :--------          |
| Title         | Theme: .PUZ format |
| Author        | J. Puz / W. Shortz |
| Copyright     | (c) 2007 J. Puz    |
| Clue#1        | Cued, in pool      |
| ...           | ...more clues...   |
| Clue#n        | Quiet              |
| Notes         | http://mywebsite   |

Extra sections
| Section Name       | Description                                    |
| :----------------- | :----------------                              |
| GRBS               | where rebuses are located in the solution      |
| RTBL               | contents of rebus squares, referred to by GRBS |
| LTIM               | timer data                                     |
| GEXT               | circled squares, incorrect and given flags     |
| RUSR               | user-entered rebus squares                     |

Extra sections format
| Component       | Length (bytes)       | Description                                                                                    |
| :-------------- | :------------------- | :----------------                                                                              |
| Title           | 0x04                 | The name of the section, these are given in the previous table                                 |
| Length          | 0x02                 | The length of the data section, in bytes, not counting the null terminator                     |
| Checksum        | 0x02                 | A checksum of the data section, using the same algorithm described above                       |
| Data            | variable             | The data, which varies in format but is always terminated by null and has the specified length |