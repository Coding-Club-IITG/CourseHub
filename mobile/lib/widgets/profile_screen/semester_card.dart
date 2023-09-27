import 'package:flutter/material.dart';

import '../../constants/themes.dart';

String calculateBranch(int rollNumber) {
  final rollNumberString = rollNumber.toString();

  final branchCode = rollNumberString.substring(4, 6);

  switch (branchCode) {
    case "06":
      return "Biosciences and Bioengineering";
    case "07":
      return "Chemical Engineering";
    case "22":
      return "Chemical Science and Technology";
    case "04":
      return "Civil Engineering";
    case "01":
      return "Computer Science and Engineering";
    case "50":
      return "Data Science and Artificial Intelligence";
    case "02":
      return "Electronics and Communication Engineering";
    case "08":
      return "Electronics and Electrical Engineering";
    case "21":
      return "Engineering Physics";
    case "23":
      return "Mathematics and Computing";
    case "03":
      return "Mechanical Engineering";
    default:
      return "Unknown Branch";
  }
}

class SemesterCard extends StatelessWidget {
  final int sem;
  const SemesterCard({super.key, required this.sem});

    String setupC(int a) {
    if (a == 1) {
      return "st";
    } else if (a == 2) {
      return "nd";
    } else if (a == 3) {
      return "rd";
    } else {
      return 'th';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Themes.kYellow,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          RichText(
            text: TextSpan(
              children: [
                TextSpan(text: '$sem', style: Themes.darkTextTheme.displayMedium),
                WidgetSpan(
                  child: Transform.translate(
                    offset: const Offset(0.0, -4.0),
                    child: Text(
                      setupC(sem),
                      style: Themes.darkTextTheme.displaySmall,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Text(
            'Semester',
            style: Themes.darkTextTheme.bodyMedium,
          ),
        ],
      ),
    );
  }
}
