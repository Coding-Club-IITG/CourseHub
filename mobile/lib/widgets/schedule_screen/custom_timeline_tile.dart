import 'package:coursehub/constants/themes.dart';
import 'package:coursehub/models/schedule.dart';
import 'package:coursehub/widgets/schedule_screen/schedule_card.dart';
import 'package:flutter/cupertino.dart';
import 'package:timeline_tile/timeline_tile.dart';

class CustomTimeLineTile extends StatelessWidget {
  final bool isFirst;
  final bool isLast;
  final bool isUpcoming;
  final String subject;
  final String room;
  final DateTime from;
  final DateTime to;

  const CustomTimeLineTile({
    super.key,
    required this.isFirst,
    required this.isLast,
    required this.isUpcoming,
    required this.subject,
    required this.room,
    required this.from,
    required this.to,
  });

  @override
  Widget build(BuildContext context) {
    return TimelineTile(
      isFirst: isFirst,
      isLast: isLast,
      beforeLineStyle: LineStyle(
        color: isUpcoming
            ? const Color.fromRGBO(133, 133, 133, 1)
            : Themes.kYellow,
      ),
      indicatorStyle: IndicatorStyle(
        color: isUpcoming
            ? const Color.fromRGBO(133, 133, 133, 1)
            : Themes.kYellow,
        width: 10,
        height: 8,
      ),
      endChild: ScheduleCard(
        isUpcoming: isUpcoming,
        subject: subject,
        room: room,
        from: from,
        to: to,
      ),
    );
  }
}
