import 'package:coursehub/widgets/attendance_screen/attendance_indicator.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';


class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Expanded(
          child: Container(
            color: Colors.black,
            child: Column(
              children: [
                const SizedBox(height: 24,),
                const Row(
                  children: [
                    SizedBox(width: 20),
                    Text(
                      'My Attendance',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Color.fromRGBO(255, 255, 255, 1),
                        fontSize: 26,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 40,),
                ListView.builder(
                  shrinkWrap: true,
                  itemCount: 4,
                  itemBuilder: (context, index) {
                      return AttendanceIndicator(attendance: 12,);
                  },
                )
              ],
            ),
          ),

        ),
      ),
    );
  }
}
