import 'package:coursehub/widgets/attendance_settings_screen/day_card.dart';
import 'package:coursehub/widgets/attendance_settings_screen/slider_toggle.dart';
import 'package:coursehub/widgets/common/nav_bar.dart';
import 'package:flutter/material.dart';

class AttendanceSettingsScreen extends StatelessWidget {
  final Color themeColor;
  const AttendanceSettingsScreen({super.key, required this.themeColor});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Ink(
          color: Colors.black,
          child: Column(
            children: [
              const NavBar(),
              const DayCard(),
              Expanded(child: SliderToggle(themeColor: themeColor))
            ],
          ),
        ),
      ),
    );
  }
}
