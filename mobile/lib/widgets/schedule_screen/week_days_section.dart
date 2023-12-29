import 'package:coursehub/widgets/schedule_screen/day_container.dart';
import 'package:flutter/material.dart';
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';

class WeekDaysSection extends StatefulWidget {
  const WeekDaysSection({super.key});

  @override
  State<WeekDaysSection> createState() => _WeekDaysSectionState();
}

class _WeekDaysSectionState extends State<WeekDaysSection> {
  final List<String> days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  int activeDayIndex = 0;
  bool activeMenu = true;
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 60,
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: AnimationLimiter(
        child: ListView.separated(
          separatorBuilder: (context, index) => const SizedBox(
            width: 20,
          ),
          scrollDirection: Axis.horizontal,
          itemCount: days.length,
          itemBuilder: (context, index) => AnimationConfiguration.staggeredList(
            position: index,
            duration: const Duration(milliseconds: 375),
            child: SlideAnimation(
              horizontalOffset: 50,
              child: FadeInAnimation(
                child: DayContainer(
                  currentDay: days[index],
                  isActive: index == activeDayIndex,
                  callback: () {
                    setState(() {
                      activeDayIndex = index;
                    });
                  },
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
