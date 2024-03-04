import 'package:coursehub/apis/schedule/schedule.dart';
import 'package:coursehub/database/cache_store.dart';
import 'package:coursehub/widgets/schedule_screen/custom_timeline_tile.dart';
import 'package:flutter/material.dart';
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';
import 'package:provider/provider.dart';

import '../../models/schedule.dart';
import '../../providers/schedule_provider.dart';
import '../common/custom_linear_progress.dart';

class ClassesSection extends StatelessWidget {
  const ClassesSection({super.key});

  @override
  Widget build(BuildContext context) {
    final daysProvider = context.read<DaysProvider>();
    return Consumer<DaysProvider>(
      builder:(context, service, child)=> Container(
        height: 250,
        padding: const EdgeInsets.only(left: 24),
        child: AnimationLimiter(
          child: ListView.builder(
            shrinkWrap: true,
            physics: const BouncingScrollPhysics(),
            itemCount: CacheStore.schedule[daysProvider.getDay()]?.length??0,
            itemBuilder: (context, index) {
              return AnimationConfiguration.staggeredList(
                position: index,
                duration: const Duration(milliseconds: 375),
                child: CustomTimeLineTile(
                  isFirst: index == 0 ? true : false,
                  isLast: index == CacheStore.schedule[daysProvider.getDay()]!.length - 1 ? true : false,
                  isUpcoming: true,
                  subject: CacheStore.schedule[daysProvider.getDay()]?[index].subject,
                  room: CacheStore.schedule[daysProvider.getDay()]?[index].room,
                  from: CacheStore.schedule[daysProvider.getDay()]?[index].from,
                  to: CacheStore.schedule[daysProvider.getDay()]?[index].to,
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
