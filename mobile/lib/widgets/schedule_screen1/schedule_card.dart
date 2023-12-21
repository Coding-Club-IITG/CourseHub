
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/svg.dart';

class ScheduleCard extends StatelessWidget {
  const ScheduleCard({super.key, required this.isUpcoming});
  final bool isUpcoming;

  @override
  Widget build(BuildContext context) {
    Color textColor = isUpcoming
        ? Colors.black // Set the color for upcoming events
        : const Color.fromRGBO(165, 165, 165, 1);
    Color bgColor = isUpcoming
        ? const Color.fromRGBO(111, 143, 254, 1) // Set the color for upcoming events
        : const Color.fromRGBO(37, 37, 37, 1);

    return Container(
      width: 282,
      height: 75,
      margin: const EdgeInsets.fromLTRB(12, 16, 12, 16),
      padding: const EdgeInsets.fromLTRB(12, 16, 12, 16),
      decoration:  BoxDecoration(
          color: bgColor
      ),
      child:  Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Process Control And Implementation',
              style: TextStyle(
                fontSize: 16, // Adjust the font size as needed
                fontWeight: FontWeight.bold, // Adjust the font weight as needed
                color: textColor, // Adjust the text color as needed
              ),
            ),
            const SizedBox(height: 10,),
            Row(
              children: [
                SvgPicture.asset(
                  'assets/Vector.svg',
                  height: 8,
                  width: 8,
                  color: textColor,
                ),
                const SizedBox(width: 4,),
                Text(
                  '8:00-10:00',
                  style: TextStyle(
                    fontSize: 12, // Adjust the font size as needed
                    color: textColor, // Adjust the text color as needed
                  ),
                ),
                const SizedBox(width: 8,),
                SvgPicture.asset(
                  'assets/e9.svg',
                  height: 3,
                  width: 3,
                  color: textColor,
                ),
                const SizedBox(width: 8,),
                SvgPicture.asset(
                  'assets/Vector_1.svg',
                  height: 8,
                  width: 8,
                  color: textColor,
                ),
                const SizedBox(width: 4,),
                Text(
                  'Lecture Hall 1',
                  style: TextStyle(
                    fontSize: 12, // Adjust the font size as needed
                    color: textColor, // Adjust the text color as needed
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
