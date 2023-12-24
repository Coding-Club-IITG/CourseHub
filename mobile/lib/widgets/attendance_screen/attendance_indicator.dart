import 'package:coursehub/widgets/attendance_screen/Custom_percent.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

class AttendanceIndicator extends StatelessWidget {
  final int attendance;
  const AttendanceIndicator({super.key, required this.attendance});
  @override
  Widget build(BuildContext context) {
    Color textColor=Colors.black;
    int remainder=23-attendance;
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      decoration:  const BoxDecoration(
          color: Color.fromRGBO(237, 244, 146, 1),
      ),
      child:  Expanded(
        child: Row(
          children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
                child: Container(
                  width: 180,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                    'Process Control And Implementation',
                    style: TextStyle(
                      fontSize: 16, // Adjust the font size as needed
                      fontWeight: FontWeight.bold, // Adjust the font weight as needed
                      color: textColor, // Adjust the
                      ),
                      ),
                      const SizedBox(height:24),
                      RichText(
                          text: TextSpan(
                            children: [
                              TextSpan(
                                text: 'You must attend ',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: textColor,
                                ),
                              ),
                              TextSpan(
                                text: '$remainder',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: textColor,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              TextSpan(
                                text: ' more classes',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: textColor,
                                ),
                              ),
                            ],
                          ),
                      )
                    ],
                  ),
                            ),
              ),
            MyCustomMarkPercentIndicator(attendance: attendance,),
          ],
        ),
      ),
    );
  }
}
