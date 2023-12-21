import 'package:coursehub/widgets/schedule_screen1/schedule_card.dart';
import 'package:flutter/cupertino.dart';
import 'package:timeline_tile/timeline_tile.dart';

class MyTimeLineTile  extends StatelessWidget {
  final bool isFirst;
  final bool isLast;
  final bool isUpcoming;

  const MyTimeLineTile({super.key, required this.isFirst, required this.isLast, required this.isUpcoming});

  @override
  Widget build(BuildContext context) {
    return TimelineTile(
      isFirst: isFirst,
      isLast: isLast,
      beforeLineStyle:  LineStyle(
        color: isUpcoming? const Color.fromRGBO(133, 133, 133, 1) :const Color.fromRGBO(181, 150, 89, 1),
      ),
      indicatorStyle:  IndicatorStyle(
        color: isUpcoming? const Color.fromRGBO(133, 133, 133, 1) :const Color.fromRGBO(181, 150, 89, 1),
        width: 10,
        height: 8,
      ),
      endChild:  ScheduleCard(isUpcoming: isUpcoming,),
    );
  }
}
